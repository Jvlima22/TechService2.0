import os
import json
import secrets
import logging
from datetime import datetime,timezone,timedelta
import httpx
from fastapi import APIRouter, BackgroundTasks, Request, Depends, HTTPException
from core import Repo, db, uid, now, require, authorize
from templates import STATUSES
router=APIRouter(prefix='/api')

def configured(channel):
    keys=['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_WHATSAPP_FROM','TWILIO_CONTENT_SID'] if channel=='whatsapp' else ['RESEND_API_KEY','RESEND_FROM_EMAIL']
    return all(os.environ.get(k) for k in keys)

async def enqueue(repo,order,link='',custom_text=None):
    company=await repo.one('companies');client=await repo.one('clients',{'id':order['client_id']})
    for channel in ['whatsapp','email']:
        recipient=client.get('phone' if channel=='whatsapp' else 'email','')
        reason=''
        if not configured(channel): reason='Credenciais do serviço não configuradas'
        if not recipient: reason='Cliente sem telefone' if channel=='whatsapp' else 'Cliente sem e-mail'
        if channel=='whatsapp' and not client.get('whatsapp_consent'): reason='WhatsApp sem consentimento do cliente'
        if company.get('demo'): reason='Ambiente de demonstração: envio externo desativado'
        text = custom_text or f"{company['name']}: OS #{order['number']} — {STATUSES[order['status']]}. {link}"
        await repo.insert('notifications',{'order_id':order['id'],'channel':channel,'recipient':recipient,'state':'not_configured' if reason else 'pending','error':reason,'attempts':0,'next_attempt':now(),'order_number':order['number'],'order_status':order['status'],'text':text,'link':link,'client_name':client['name']})

async def send(notification):
    n=notification
    async with httpx.AsyncClient(timeout=20) as http:
        if n['channel']=='email':
            r=await http.post(f"{os.environ['RESEND_API_URL']}/emails",headers={'Authorization':f"Bearer {os.environ['RESEND_API_KEY']}",'Idempotency-Key':n['id']},json={'from':os.environ['RESEND_FROM_EMAIL'],'to':[n['recipient']],'subject':f"Atualização da OS #{n['order_number']}",'text':n['text']})
            r.raise_for_status(); return r.json()['id'],'accepted'
        phone=''.join(x for x in n['recipient'] if x.isdigit())
        if not n['recipient'].startswith('+'): raise ValueError('Telefone precisa incluir + e código do país')
        sid=os.environ['TWILIO_ACCOUNT_SID']
        r=await http.post(f"{os.environ['TWILIO_API_URL']}/Accounts/{sid}/Messages.json",auth=(sid,os.environ['TWILIO_AUTH_TOKEN']),data={'From':os.environ['TWILIO_WHATSAPP_FROM'],'To':f'whatsapp:+{phone}','ContentSid':os.environ['TWILIO_CONTENT_SID'],'ContentVariables':json.dumps({'1':n['client_name'],'2':str(n['order_number']),'3':STATUSES[n['order_status']],'4':n['link'] or 'Entre em contato com a empresa'})})
        r.raise_for_status();return r.json()['sid'],'accepted'

async def delivery(n):
    async with httpx.AsyncClient(timeout=15) as http:
        if n['channel']=='email':
            r=await http.get(f"{os.environ['RESEND_API_URL']}/emails/{n['provider_id']}",headers={'Authorization':f"Bearer {os.environ['RESEND_API_KEY']}"});r.raise_for_status();state=r.json().get('last_event','')
            return 'delivered' if state in ['delivered','opened','clicked'] else 'failed' if state in ['bounced','failed','complained'] else 'accepted'
        sid=os.environ['TWILIO_ACCOUNT_SID'];r=await http.get(f"{os.environ['TWILIO_API_URL']}/Accounts/{sid}/Messages/{n['provider_id']}.json",auth=(sid,os.environ['TWILIO_AUTH_TOKEN']));r.raise_for_status();state=r.json().get('status','')
        return 'delivered' if state in ['delivered','read'] else 'failed' if state in ['failed','undelivered'] else 'accepted'

async def process_company(company_id):
    p={'id':'notification-worker','name':'Sistema','role':'worker','company_id':company_id};authorize(p,'notify');repo=Repo(p)
    # A scoped compare-and-set claim prevents concurrent workers sending the same queue record.
    queue=await repo.find('notifications',{'state':{'$in':['pending','retry','sending','accepted']},'next_attempt':{'$lte':now()}},limit=100)
    for n in queue:
        if n['state']=='accepted':
            try:
                state=await delivery(n)
                await repo.update('notifications',{'id':n['id'],'state':'accepted'},{'state':state,'next_attempt':(datetime.now(timezone.utc)+timedelta(minutes=15)).isoformat(),'error':'Falha de entrega informada pelo provedor' if state=='failed' else ''})
            except Exception: logging.warning('Delivery check unavailable for notification %s',n['id'])
            continue
        if n['state']=='sending' and n['channel']=='whatsapp':
            await repo.update('notifications',{'id':n['id'],'state':'sending'},{'state':'unknown','error':'Resultado de envio incerto; confirme no provedor antes de reenviar'})
            continue
        claim=await repo.update('notifications',{'id':n['id'],'state':n['state'],'next_attempt':n['next_attempt']},{'state':'sending','next_attempt':(datetime.now(timezone.utc)+timedelta(minutes=5)).isoformat()})
        if not claim.modified_count: continue
        try:
            provider_id,state=await send(n)
            await repo.update('notifications',{'id':n['id']},{'state':state,'provider_id':provider_id,'attempts':n['attempts']+1,'error':'','next_attempt':(datetime.now(timezone.utc)+timedelta(minutes=15)).isoformat()})
        except Exception as e:
            count=n['attempts']+1
            code=e.response.status_code if isinstance(e,httpx.HTTPStatusError) else None
            uncertain=n['channel']=='whatsapp' and isinstance(e,httpx.TimeoutException)
            state='unknown' if uncertain else 'retry' if count<3 and (code is None or code>=500 or code==429) else 'failed'
            await repo.update('notifications',{'id':n['id']},{'state':state,'attempts':count,'error':'Envio não confirmado. Verifique o provedor.' if uncertain else f"Falha no envio{f' (HTTP {code})' if code else ''}. Verifique credenciais e destinatário.",'next_attempt':(datetime.now(timezone.utc)+timedelta(minutes=15*count)).isoformat()})

@router.post('/notifications/{notification_id}/retry')
async def retry(notification_id:str,tasks:BackgroundTasks,p=Depends(require('operate'))):
    repo=Repo(p);n=await repo.one('notifications',{'id':notification_id});c=await repo.one('companies')
    if c.get('demo'):raise HTTPException(422,'Envios externos desativados na demonstração')
    if not configured(n['channel']):raise HTTPException(422,'Configure as credenciais do serviço antes de reenviar')
    client=await repo.one('clients',{'id':(await repo.one('orders',{'id':n['order_id']}))['client_id']})
    recipient=client.get('phone' if n['channel']=='whatsapp' else 'email','')
    if not recipient or (n['channel']=='whatsapp' and not client.get('whatsapp_consent')):raise HTTPException(422,'Confirme contato e consentimento do cliente')
    if n['state'] in ['delivered','accepted','sending','unknown']:raise HTTPException(409,'Notificação já enviada ou aguardando confirmação')
    await repo.update('notifications',{'id':notification_id},{'state':'pending','recipient':recipient,'error':'','attempts':0,'next_attempt':now()});tasks.add_task(process_company,p['company_id']);return {'queued':True}

async def run_maintenance():
    from orders import expire
    # System tenant directory discovery; each operation is performed with an explicit scoped worker.
    async for c in db.companies.find({}, {'_id':0,'company_id':1}):
        p={'id':'system','name':'Sistema','role':'worker','company_id':c['company_id']};authorize(p,'expire');repo=Repo(p)
        for o in await repo.find('orders',{'status':'awaiting','approval_expires':{'$lt':now()}}):
            try: await expire(repo,o)
            except HTTPException: pass
        await process_company(c['company_id'])

@router.post('/cron/notifications')
async def cron(request:Request,tasks:BackgroundTasks):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    auth=request.headers.get('Authorization','')
    if not auth.startswith('Bearer ') or not secrets.compare_digest(auth[7:],os.environ['WEBHOOK_CRON_SECRET']):raise HTTPException(401,'Não autorizado')
    try:
        body=await request.json()
        run_id=request.headers.get('X-Webhook-Id') or body.get('run_id')
        if not isinstance(body,dict) or body.get('event')!='schedule.triggered' or not run_id:raise ValueError()
    except Exception:raise HTTPException(400,'Evento inválido')
    from pymongo.errors import DuplicateKeyError
    try:await db.cron_runs.insert_one({'run_id':run_id,'created_at':now()})
    except DuplicateKeyError:return {'accepted':True,'duplicate':True}
    tasks.add_task(run_maintenance);return {'accepted':True}