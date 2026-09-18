import re
import secrets
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError
from core import db, Repo, uid, now, JWT_SECRET, principal, audit
from models import Register, Login, ForgotPassword, ResetPassword
from templates import TEMPLATES, template

router = APIRouter(prefix='/api/auth')
def hash_password(password): return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
def public_user(u):
    return {**{k:u[k] for k in ['id','name','email','role','company_id']}, 'profile_image_url':'/api/profile/avatar' if u.get('profile_image_path') else ''}
async def session(user):
    token = jwt.encode({'sub':user['id'],'company_id':user['company_id'],'scope':'session','exp':datetime.now(timezone.utc)+timedelta(days=3)}, JWT_SECRET, algorithm='HS256')
    c = await Repo(user).one('companies')
    return {'token':token,'user':public_user(user),'company':c,'template':template(c['niche'])}

async def create_company(data, demo=False):
    company_id = uid(); repo = Repo({'company_id':company_id})
    code = re.sub('[^a-z0-9]+', '-', data.company_name.lower()).strip('-')[:30] + '-' + secrets.token_hex(2)
    company = await repo.insert('companies', {'id':company_id,'name':data.company_name,'code':code,'niche':data.niche,'custom_fields':[],'counter':1000,'demo':demo})
    for t in TEMPLATES: await repo.insert('templates', {**t, 'id':uid(), 'template_key':t['id']})
    user = await repo.insert('users', {'name':data.name,'email':str(data.email).lower(),'password_hash':hash_password(data.password),'role':'admin','active':True})
    await audit({**user}, 'company_created', 'Empresa cadastrada')
    return user

@router.get('/templates')
async def templates(): return TEMPLATES

@router.post('/register')
async def register(data: Register):
    user = await create_company(data)
    return await session(user)

@router.post('/login')
async def login(data: Login):
    # Identity resolution is the only global user lookup; authorization always uses the scoped repo.
    query = {'email':str(data.email).lower(), 'active':True}
    if data.company_code:
        c = await db.companies.find_one({'code':data.company_code}, {'_id':0})
        if not c: raise HTTPException(401, 'Empresa, e-mail ou senha incorretos')
        query['company_id'] = c['company_id']
    candidates = await db.users.find(query, {'_id':0}).to_list(100)
    matches = [u for u in candidates if bcrypt.checkpw(data.password.encode()[:72], u['password_hash'].encode())]
    if len(matches) > 1: raise HTTPException(409, 'Informe o código da empresa para selecionar sua conta')
    if not matches: raise HTTPException(401, 'Empresa, e-mail ou senha incorretos')
    return await session(matches[0])

@router.get('/me')
async def me(p=Depends(principal)):
    return await session(await Repo(p).one('users', {'id':p['id']}))

@router.post('/demo')
async def demo():
    from seed import seed_demo
    data = Register(name='Rafael Silva',company_name='TechFix Assistência',email=f'demo-{uid()}@example.com',password=secrets.token_urlsafe(24),niche='assistance')
    user = await create_company(data, True)
    await seed_demo(user)
    return await session(user)

@router.post('/forgot-password')
async def forgot_password(data: ForgotPassword):
    import os, httpx
    # Busca global pelo e-mail (pode existir em mais de uma empresa)
    candidates = await db.users.find(
        {'email': str(data.email).lower(), 'active': True}, {'_id': 0}
    ).to_list(10)
    # Responde sempre com sucesso para não vazar se o e-mail existe
    if not candidates:
        return {'ok': True}
    user = candidates[0]
    # Gera token JWT de reset (escopo isolado, expira em 1 hora)
    reset_token = jwt.encode(
        {
            'sub': user['id'],
            'company_id': user['company_id'],
            'scope': 'reset',
            'exp': datetime.now(timezone.utc) + timedelta(hours=1),
        },
        JWT_SECRET,
        algorithm='HS256',
    )
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    reset_link = f"{frontend_url}/auth/reset/{reset_token}"
    resend_key = os.environ.get('RESEND_API_KEY', '')
    resend_from = os.environ.get('RESEND_FROM_EMAIL', '')
    resend_url = os.environ.get('RESEND_API_URL', 'https://api.resend.com')
    if resend_key and resend_from:
        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.post(
                f"{resend_url}/emails",
                headers={'Authorization': f'Bearer {resend_key}'},
                json={
                    'from': resend_from,
                    'to': [user['email']],
                    'subject': 'Recuperação de senha — TechService',
                    'html': (
                        f'<p>Olá, {user["name"]}!</p>'
                        f'<p>Clique no link abaixo para redefinir sua senha. '
                        f'O link expira em <strong>1 hora</strong>.</p>'
                        f'<p><a href="{reset_link}">{reset_link}</a></p>'
                        f'<p>Se você não solicitou a recuperação de senha, ignore este e-mail.</p>'
                    ),
                },
            )
            print("Resend status:", r.status_code)
            print("Resend response:", r.text)
    return {'ok': True}

@router.post('/reset-password')
async def reset_password(data: ResetPassword):
    try:
        payload = jwt.decode(data.token, JWT_SECRET, algorithms=['HS256'])
        if payload.get('scope') != 'reset':
            raise ValueError('scope inválido')
    except Exception:
        raise HTTPException(400, 'Link de recuperação inválido ou expirado')
    repo = Repo({'company_id': payload['company_id']})
    user = await repo.one('users', {'id': payload['sub'], 'active': True}, required=False)
    if not user:
        raise HTTPException(400, 'Usuário não encontrado ou inativo')
    new_hash = hash_password(data.password)
    await repo.update('users', {'id': user['id']}, {'password_hash': new_hash})
    await audit({**user}, 'password_reset', 'Senha redefinida via link de recuperação')
    return {'ok': True}
