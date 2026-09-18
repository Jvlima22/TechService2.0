import os, secrets, urllib.parse, httpx
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pymongo.errors import DuplicateKeyError
from core import db, Repo, require, audit, uid, now, order_view
from models import ClientInput, UserInput, CustomField, CompanyInput, PaymentSettingsInput, DocResponse
from auth_routes import hash_password, public_user
from templates import STATUSES
router=APIRouter(prefix='/api')

@router.get('/clients',response_model=list[DocResponse])
async def clients(p=Depends(require('read'))): return await Repo(p).find('clients')
@router.post('/clients',response_model=DocResponse)
async def create_client(data:ClientInput,p=Depends(require('operate'))):
    client=await Repo(p).insert('clients',data.model_dump()); await audit(p,'client_created',f"Cliente {data.name} cadastrado"); return client
@router.put('/clients/{client_id}',response_model=DocResponse)
async def update_client(client_id:str,data:ClientInput,p=Depends(require('operate'))):
    repo=Repo(p); await repo.one('clients',{'id':client_id}); await repo.update('clients',{'id':client_id},data.model_dump()); await audit(p,'client_updated',f"Cliente {data.name} atualizado");return await repo.one('clients',{'id':client_id})

@router.get('/users')
async def users(p=Depends(require('read'))):
    data=await Repo(p).find('users',{'active':True})
    if p['role']=='admin': return [public_user(u) for u in data]
    return [{'id':u['id'],'name':u['name'],'role':u['role']} for u in data]
@router.post('/users')
async def add_user(data:UserInput,p=Depends(require('users'))):
    repo=Repo(p)
    try: u=await repo.insert('users',{'name':data.name,'email':str(data.email).lower(),'password_hash':hash_password(data.password),'role':data.role,'active':True})
    except DuplicateKeyError: raise HTTPException(409,'Este e-mail já faz parte da equipe')
    await audit(p,'user_created',f"{data.name} adicionado à equipe como {data.role}")
    return public_user(u)
@router.delete('/users/{user_id}')
async def deactivate(user_id:str,p=Depends(require('users'))):
    if user_id==p['id']: raise HTTPException(422,'Você não pode remover seu próprio acesso')
    repo=Repo(p); u=await repo.one('users',{'id':user_id});await repo.update('users',{'id':user_id},{'active':False}); await audit(p,'user_deactivated',f"Acesso de {u['name']} removido");return {'ok':True}

@router.put('/company')
async def update_company(data:CompanyInput,p=Depends(require('settings'))):
    repo=Repo(p);await repo.update('companies',{}, {'name':data.name});await audit(p,'company_updated','Dados da empresa atualizados');return await repo.one('companies')
@router.post('/company/custom-fields')
async def custom_field(data:CustomField,p=Depends(require('settings'))):
    repo=Repo(p); company=await repo.one('companies')
    if any(f['name'].casefold()==data.name.casefold() for f in company['custom_fields']): raise HTTPException(409,'Já existe um campo com esse nome')
    if data.type=='select' and (not data.options or any(not o.strip() for o in data.options)): raise HTTPException(422,'Informe as opções da lista')
    field={**data.model_dump(),'id':uid()};result=await repo.push_field(field)
    if not result.modified_count: raise HTTPException(422,'Limite de 5 campos personalizados atingido')
    await audit(p,'field_created',f"Campo {data.name} adicionado")
    return field
@router.get('/integrations')
async def integrations(p=Depends(require('settings'))):
    from notifications import configured
    return {'whatsapp':configured('whatsapp'),'email':configured('email'),'storage':bool(os.environ.get('EMERGENT_LLM_KEY'))}

@router.get('/payment-settings')
async def payment_settings(p=Depends(require('settings'))):
    company=await Repo(p).one('companies')
    settings=company.get('payment_settings', {})
    return {'pix_key_type':settings.get('pix_key_type','cpf_cnpj'),'pix_key':settings.get('pix_key',''),'gateway_provider':settings.get('gateway_provider','none'),'gateway_auth_method':settings.get('gateway_auth_method','token'),'gateway_connected':bool(settings.get('gateway_api_key') or settings.get('oauth_access_token')),'oauth_account_id':settings.get('oauth_account_id','')}

@router.put('/payment-settings')
async def update_payment_settings(data:PaymentSettingsInput,p=Depends(require('settings'))):
    repo=Repo(p)
    values=data.model_dump()
    values['gateway_api_key']=values['gateway_api_key'].strip()
    company=await repo.one('companies'); previous=company.get('payment_settings',{})
    if not values['gateway_api_key']:
        values['gateway_api_key']=previous.get('gateway_api_key','')
    for key in ('oauth_access_token','oauth_refresh_token','oauth_account_id','oauth_expires_in'):
        if key in previous: values[key]=previous[key]
    await repo.update('companies',{}, {'payment_settings':values})
    await audit(p,'payment_settings_updated','Configurações de recebimento atualizadas')
    return {'pix_key_type':values['pix_key_type'],'pix_key':values['pix_key'],'gateway_provider':values['gateway_provider'],'gateway_auth_method':values['gateway_auth_method'],'gateway_connected':bool(values['gateway_api_key'] or values.get('oauth_access_token'))}

@router.get('/payment-oauth/{provider}/start')
async def payment_oauth_start(provider:str,p=Depends(require('settings'))):
    if provider not in ('mercadopago','stripe'): raise HTTPException(400,'Este provedor não oferece OAuth neste fluxo')
    env=os.environ; prefix='MERCADOPAGO' if provider=='mercadopago' else 'STRIPE'
    client_id=env.get(f'{prefix}_CLIENT_ID',''); redirect_uri=env.get(f'{prefix}_OAUTH_REDIRECT_URI','')
    if not client_id or not redirect_uri: raise HTTPException(503,f'Configure {prefix}_CLIENT_ID e {prefix}_OAUTH_REDIRECT_URI no backend')
    state=secrets.token_urlsafe(32); await db.oauth_states.insert_one({'state':state,'provider':provider,'company_id':p['company_id'],'created_at':now()})
    if provider=='mercadopago':
        url='https://auth.mercadopago.com.br/authorization?'+urllib.parse.urlencode({'client_id':client_id,'response_type':'code','platform_id':'mp','redirect_uri':redirect_uri,'state':state})
    else:
        url='https://connect.stripe.com/oauth/authorize?'+urllib.parse.urlencode({'client_id':client_id,'response_type':'code','scope':'read_write','redirect_uri':redirect_uri,'state':state})
    return {'authorization_url':url}

@router.get('/payment-oauth/{provider}/callback')
async def payment_oauth_callback(provider:str,code:str='',state:str='',error:str='',error_description:str=''):
    if error: raise HTTPException(400,error_description or error)
    if provider not in ('mercadopago','stripe') or not code or not state: raise HTTPException(400,'Callback OAuth inválido')
    saved=await db.oauth_states.find_one_and_delete({'state':state})
    if not saved or saved['provider']!=provider: raise HTTPException(400,'State OAuth inválido ou expirado')
    env=os.environ; prefix='MERCADOPAGO' if provider=='mercadopago' else 'STRIPE'; redirect_uri=env.get(f'{prefix}_OAUTH_REDIRECT_URI','')
    payload={'grant_type':'authorization_code','client_id':env.get(f'{prefix}_CLIENT_ID',''),'client_secret':env.get(f'{prefix}_CLIENT_SECRET',''),'code':code,'redirect_uri':redirect_uri}
    token_url='https://api.mercadopago.com/oauth/token' if provider=='mercadopago' else 'https://connect.stripe.com/oauth/token'
    async with httpx.AsyncClient(timeout=20) as client: response=await client.post(token_url,data=payload)
    if response.status_code>=400: raise HTTPException(502,'Não foi possível concluir a autorização do provedor')
    token=response.json(); repo=Repo({'company_id':saved['company_id']}); company=await repo.one('companies')
    settings=company.get('payment_settings',{}); settings.update({'gateway_provider':provider,'gateway_auth_method':'oauth','oauth_access_token':token.get('access_token',''),'oauth_refresh_token':token.get('refresh_token',''),'oauth_account_id':token.get('user_id') or token.get('stripe_user_id',''),'oauth_expires_in':token.get('expires_in')})
    await repo.update('companies',{}, {'payment_settings':settings}); await audit({'company_id':saved['company_id'],'name':'OAuth'},'payment_oauth_connected',f'{provider} conectado via OAuth')
    frontend=os.environ.get('FRONTEND_URL','/')
    return RedirectResponse(f"{frontend.rstrip('/')}/settings?oauth={provider}&status=connected")
@router.get('/audit')
async def history(p=Depends(require('audit'))): return await Repo(p).find('audit',limit=300)

@router.get('/search')
async def global_search(q: str = '', p=Depends(require('read'))):
    if not q or not q.strip():
        return {'orders': [], 'clients': []}
    repo = Repo(p)
    term = q.strip().lower()
    from orders import expire
    
    # Multitenant order search
    all_orders = await repo.find('orders', limit=300)
    matched_orders = []
    for raw in all_orders:
        o = await expire(repo, raw)
        search_text = f"#{o.get('number', '')} {o.get('number', '')} {o.get('client_name', '')} {o.get('item', '')} {o.get('problem', '')} {o.get('diagnosis', '')} {o.get('technician_name', '')}".lower()
        if term in search_text:
            matched_orders.append(order_view(o, p))
            if len(matched_orders) >= 10:
                break
                
    # Multitenant client search
    all_clients = await repo.find('clients', limit=300)
    matched_clients = []
    for c in all_clients:
        client_text = f"{c.get('name', '')} {c.get('phone', '')} {c.get('email', '')} {c.get('document', '')}".lower()
        if term in client_text:
            matched_clients.append(c)
            if len(matched_clients) >= 8:
                break
                
    return {'orders': matched_orders, 'clients': matched_clients}

@router.get('/dashboard')
async def dashboard(days:int=30,p=Depends(require('finance'))):
    if days not in [7,30,90]: raise HTTPException(422,'Período inválido')
    from orders import expire
    repo=Repo(p); all_orders=[await expire(repo,o) for o in await repo.find('orders')]
    start=(datetime.now(timezone.utc)-timedelta(days=days)).isoformat()
    orders=[o for o in all_orders if o['created_at']>=start]
    counts={s:len([o for o in orders if o['status']==s]) for s in STATUSES}
    payments=[x for o in all_orders for x in o.get('payments',[]) if x['at']>=start]
    completed=[o for o in orders if o.get('completed_at')]
    durations=[(datetime.fromisoformat(o['completed_at'])-datetime.fromisoformat(o['created_at'])).total_seconds()/86400 for o in completed]
    techs=await repo.find('users',{'active':True})
    productivity=[{'name':u['name'],'id':u['id'],'assigned':len([o for o in orders if o['technician_id']==u['id']]),'completed':len([o for o in completed if o['technician_id']==u['id']])} for u in techs]
    chart=[]
    for i in range(6,-1,-1):
        day=(datetime.now(timezone.utc)-timedelta(days=i)).date().isoformat()
        chart.append({'date':day,'opened':sum(o['created_at'][:10]==day for o in all_orders),'completed':sum(o.get('completed_at','')[:10]==day for o in all_orders),'revenue':round(sum(x['amount'] for x in payments if x['at'][:10]==day),2)})
    return {'total':len(orders),'active':sum(counts[s] for s in ['open','diagnosis','awaiting','approved','in_progress']),'awaiting':counts['awaiting'],'completed':counts['completed']+counts['delivered'],'revenue':round(sum(x['amount'] for x in payments),2),'receivable':round(sum(max(0,o['total']-o['paid']) for o in orders if o['status'] not in ['cancelled','rejected']),2),'avg_days':round(sum(durations)/len(durations),1) if durations else 0,'counts':counts,'chart':chart,'productivity':productivity,'recent':[order_view(o,p) for o in orders[:6]],'activity':await repo.find('audit',limit=4),'cancellations':[order_view(o,p) for o in orders if o['status']=='cancelled']}
