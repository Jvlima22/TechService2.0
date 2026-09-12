import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError
from core import Repo, require, audit, uid, now, order_view
from models import ClientInput, UserInput, CustomField, CompanyInput, DocResponse
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