import hashlib
import os
import jwt
from datetime import datetime, timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from core import Repo, require, now, uid, audit, order_view, JWT_SECRET, authorize
from models import OrderInput, QuoteInput, Transition, Decision, Payment
from templates import template, validate_fields, STATUSES, TRANSITIONS

router = APIRouter(prefix='/api')
def rounded(value): return float(Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
def total_quote(lines): return rounded(sum(Decimal(str(l['quantity'])) * Decimal(str(l['unit_price'])) for l in lines))

async def commit(repo, order, values):
    values.update({'version':order['version']+1,'updated_at':now()})
    result = await repo.update('orders', {'id':order['id'],'version':order['version']}, values)
    if not result.modified_count: raise HTTPException(409, 'A ordem foi atualizada. Recarregue e tente novamente.')
    return {**order, **values}

async def notify(repo, order, tasks, link=''):
    from notifications import enqueue, process_company
    await enqueue(repo, order, link)
    tasks.add_task(process_company, repo.company_id)

async def expire(repo, order):
    if order['status']=='awaiting' and order.get('approval_expires','z') < now():
        order = await commit(repo, order, {'status':'diagnosis','approval_hash':'','approval_expired':True})
        p={'id':'system','name':'Sistema','role':'worker','company_id':repo.company_id}
        authorize(p, 'expire')
        await audit(p,'approval_expired','Orçamento expirou e voltou para diagnóstico',order['id'])
    return order

@router.get('/orders')
async def orders(status: str='', search: str='', technician_id: str='', p=Depends(require('read'))):
    repo=Repo(p); query={}
    if status: query['status']=status
    if technician_id: query['technician_id']=technician_id
    result = await repo.find('orders', query)
    result = [await expire(repo,o) for o in result]
    if status: result=[o for o in result if o['status']==status]
    if search:
        search=search.lower()
        result=[o for o in result if search in f"{o['number']} {o['client_name']} {o['item']}".lower()]
    return [order_view(o,p) for o in result]

@router.post('/orders')
async def create_order(data:OrderInput, tasks:BackgroundTasks, p=Depends(require('operate'))):
    repo=Repo(p); company=await repo.one('companies'); client=await repo.one('clients',{'id':data.client_id})
    tech=await repo.one('users',{'id':data.technician_id,'active':True}) if data.technician_id else None
    validate_fields(data.item_fields,template(company['niche'])['fields']); validate_fields(data.custom_values,company['custom_fields'])
    item=await repo.insert('items',{'client_id':client['id'],'name':data.item,'fields':data.item_fields})
    order=await repo.insert('orders',{**data.model_dump(),'item_id':item['id'],'client_name':client['name'],'number':await repo.counter(),'technician_name':tech['name'] if tech else 'Não atribuído','status':'open','diagnosis':'','quote':[],'total':0,'paid':0,'payments':[],'version':1,'updated_at':now()})
    await audit(p,'order_created',f"OS #{order['number']} aberta",order['id'])
    await notify(repo,order,tasks)
    return order_view(order,p)

@router.get('/orders/{order_id}')
async def order_detail(order_id:str,p=Depends(require('read'))):
    repo=Repo(p); order=await expire(repo,await repo.one('orders',{'id':order_id}))
    history=await repo.find('audit',{'order_id':order_id})
    if p['role']!='admin': history=[h for h in history if h['action']!='payment_recorded']
    return {'order':order_view(order,p),'client':await repo.one('clients',{'id':order['client_id']}),'history':history,'notifications':await repo.find('notifications',{'order_id':order_id}),'attachments':await repo.find('attachments',{'order_id':order_id,'is_deleted':False})}

@router.put('/orders/{order_id}/quote')
async def quote(order_id:str,data:QuoteInput,p=Depends(require('operate'))):
    repo=Repo(p); order=await expire(repo,await repo.one('orders',{'id':order_id}))
    if order['status'] not in ['diagnosis','rejected']: raise HTTPException(409,'Orçamento só pode ser editado durante diagnóstico ou revisão')
    lines=[l.model_dump() for l in data.quote]; total=total_quote(lines)
    new=await commit(repo,order,{'diagnosis':data.diagnosis,'quote':lines,'total':total,'approval_hash':''})
    await audit(p,'quote_updated','Diagnóstico e orçamento atualizados',order_id,{'before':order['total'],'after':total})
    return order_view(new,p)

async def request_approval(repo,order,p,tasks):
    if not order.get('quote') or not order.get('diagnosis'): raise HTTPException(422,'Registre o diagnóstico e pelo menos um item de orçamento')
    expires=datetime.now(timezone.utc)+timedelta(days=3)
    token=jwt.encode({'scope':'approval','company_id':repo.company_id,'order_id':order['id'],'jti':uid(),'exp':expires}, JWT_SECRET, algorithm='HS256')
    new=await commit(repo,order,{'status':'awaiting','approval_hash':hashlib.sha256(token.encode()).hexdigest(),'approval_expires':expires.isoformat(),'approval_decision':None})
    await audit(p,'status_changed','Orçamento enviado para aprovação',order['id'],{'from':order['status'],'to':'awaiting'})
    link=f"{os.environ['APP_URL'].rstrip('/')}/p/{token}"
    await notify(repo,new,tasks,link)
    return {'order':order_view(new,p),'approval_url':link}

@router.post('/orders/{order_id}/status')
async def transition(order_id:str,data:Transition,tasks:BackgroundTasks,p=Depends(require('operate'))):
    repo=Repo(p); order=await expire(repo,await repo.one('orders',{'id':order_id}))
    if data.status not in TRANSITIONS.get(order['status'],[]): raise HTTPException(409,'Transição de status não permitida')
    if data.status=='delivered': authorize(p,'finance')
    if data.status=='cancelled' and len(data.reason.strip())<3: raise HTTPException(422,'Informe o motivo do cancelamento')
    if data.status=='awaiting': return await request_approval(repo,order,p,tasks)
    values={'status':data.status}
    if data.status=='diagnosis': values['approval_hash']=''
    if data.status=='cancelled': values['cancel_reason']=data.reason
    if data.status=='completed': values['completed_at']=now()
    new=await commit(repo,order,values)
    await audit(p,'status_changed',f"Status alterado para {STATUSES[data.status]}"+(f': {data.reason}' if data.reason else ''),order_id,{'from':order['status'],'to':data.status})
    await notify(repo,new,tasks)
    return {'order':order_view(new,p)}

@router.post('/orders/{order_id}/approval-link')
async def approval_link(order_id:str,tasks:BackgroundTasks,p=Depends(require('operate'))):
    repo=Repo(p); order=await expire(repo,await repo.one('orders',{'id':order_id}))
    if order['status'] not in ['diagnosis','awaiting','rejected']: raise HTTPException(409,'Orçamento não está em revisão ou aguardando aprovação')
    return await request_approval(repo,order,p,tasks)

@router.post('/orders/{order_id}/payment')
async def payment(order_id:str,data:Payment,p=Depends(require('finance'))):
    repo=Repo(p); order=await repo.one('orders',{'id':order_id})
    if order['status'] in ['cancelled','rejected','open','diagnosis','awaiting']: raise HTTPException(409,'O orçamento precisa estar aprovado para registrar pagamento')
    paid=rounded(order['paid']+data.amount)
    if paid>order['total']: raise HTTPException(422,'Pagamento maior que o saldo pendente')
    payment={'id':uid(),'amount':rounded(data.amount),'method':data.method,'at':now(),'actor':p['name']}
    new=await commit(repo,order,{'paid':paid,'payments':order.get('payments',[])+[payment]})
    await audit(p,'payment_recorded',f"Pagamento de R$ {data.amount:.2f} registrado",order_id,{'before':order['paid'],'after':paid})
    return order_view(new,p)

async def resolve_public(token):
    try:
        payload=jwt.decode(token,JWT_SECRET,algorithms=['HS256'],options={'verify_exp':False})
        if payload.get('scope')!='approval': raise ValueError()
    except Exception: raise HTTPException(404,'Link inválido')
    p={'id':'customer','name':'Cliente','role':'customer','company_id':payload['company_id']}; authorize(p,'approve')
    repo=Repo(p); order=await repo.one('orders',{'id':payload['order_id']})
    token_hash=hashlib.sha256(token.encode()).hexdigest()
    if order.get('approval_hash')!=token_hash: raise HTTPException(410,'Este link foi substituído ou não está mais disponível')
    if payload['exp']<datetime.now(timezone.utc).timestamp():
        await expire(repo,order)
        raise HTTPException(410,'Orçamento expirado. Solicite um novo link à empresa.')
    return p,repo,order

@router.get('/public/orders/{token}')
async def public_order(token:str):
    p,repo,order=await resolve_public(token); company=await repo.one('companies')
    return {'company_name':company['name'],'number':order['number'],'item':order['item'],'problem':order['problem'],'diagnosis':order['diagnosis'],'quote':order['quote'],'total':order['total'],'status':order['status'],'expires':order['approval_expires'],'decision':order.get('approval_decision')}

@router.post('/public/orders/{token}/decision')
async def public_decision(token:str,data:Decision,tasks:BackgroundTasks):
    p,repo,order=await resolve_public(token)
    if order['status']!='awaiting' or order.get('approval_decision'): raise HTTPException(409,'Este orçamento já recebeu uma resposta')
    if data.decision=='rejected' and len(data.reason.strip())<3: raise HTTPException(422,'Informe o motivo da recusa')
    decision={'name':data.name,'decision':data.decision,'reason':data.reason,'at':now()}
    new=await commit(repo,order,{'status':data.decision,'approval_decision':decision})
    p['name']=data.name
    await audit(p,'customer_decision',f"Orçamento {'aprovado' if data.decision=='approved' else 'recusado'} por {data.name}"+(f': {data.reason}' if data.reason else ''),order['id'])
    await notify(repo,new,tasks)
    return {'status':new['status'],'decision':decision}