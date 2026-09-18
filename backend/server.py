import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from core import db, client
from auth_routes import router as auth_router
from orders import router as orders_router
from data_routes import router as data_router
from notifications import router as notifications_router
from storage import router as storage_router
from payment_routes import router as payment_router
from webhooks import router as webhooks_router

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app):
    for col in ['companies','users','clients','orders','items','templates','notifications','audit','attachments']:
        await db[col].create_index([('company_id',1),('id',1)],unique=True)
    await db.users.create_index([('company_id',1),('email',1)],unique=True)
    await db.companies.create_index('code',unique=True)
    await db.orders.create_index([('company_id',1),('number',1)],unique=True)
    await db.notifications.create_index([('company_id',1),('state',1),('next_attempt',1)])
    await db.cron_runs.create_index('run_id',unique=True)
    await db.auth_limits.create_index('expires_at',expireAfterSeconds=0)
    try:
        from storage import init_storage
        await init_storage()
    except Exception:logging.warning('Object storage unavailable at startup; will retry on upload')
    yield
    client.close()

app=FastAPI(title='Tech Service API',lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=os.environ['CORS_ORIGINS'].split(','),allow_credentials=False,allow_methods=['GET','POST','PUT','DELETE','OPTIONS'],allow_headers=['Authorization','Content-Type'])

@app.middleware('http')
async def auth_rate_limit(request:Request,call_next):
    if request.url.path in ['/api/auth/login','/api/auth/demo','/api/auth/register'] and request.method=='POST':
        from datetime import datetime,timezone,timedelta
        import hashlib
        current=datetime.now(timezone.utc);ip=request.client.host if request.client else 'unknown'
        key=hashlib.sha256(f"{ip}:{request.url.path}:{int(current.timestamp())//60}".encode()).hexdigest()
        result=await db.auth_limits.find_one_and_update({'_id':key},{'$inc':{'count':1},'$setOnInsert':{'expires_at':current+timedelta(minutes=2)}},upsert=True,return_document=True)
        if result['count']>30:return JSONResponse({'detail':'Muitas tentativas. Aguarde um minuto.'},status_code=429)
    return await call_next(request)

@app.get('/api/')
async def health():return {'status':'ok','app':'Tech Service'}
for router in [auth_router,orders_router,data_router,notifications_router,storage_router,payment_router,webhooks_router]:app.include_router(router)