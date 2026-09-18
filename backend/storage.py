import os
import asyncio
import httpx
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Response
from core import Repo, require, uid, audit
router=APIRouter(prefix='/api')
STORAGE_BASE=(os.environ.get('INTEGRATION_PROXY_URL') or '').strip() or 'https://integrations.emergentagent.com'
STORAGE_URL=STORAGE_BASE.rstrip('/')+'/objstore/api/v1/storage'
storage_key=None
lock=asyncio.Lock()

async def init_storage(force=False):
    global storage_key
    async with lock:
        if storage_key and not force:return storage_key
        async with httpx.AsyncClient(timeout=30) as http:
            r=await http.post(f'{STORAGE_URL}/init',json={'emergent_key':os.environ.get('EMERGENT_LLM_KEY')});r.raise_for_status();storage_key=r.json()['storage_key'];return storage_key

async def storage_request(method,path,**kwargs):
    key=await init_storage()
    async with httpx.AsyncClient(timeout=90) as http:
        headers=kwargs.pop('headers',{})
        r=await http.request(method,f'{STORAGE_URL}/objects/{path}',headers={**headers,'X-Storage-Key':key},**kwargs)
        if r.status_code==404:
            key=await init_storage(True)
            r=await http.request(method,f'{STORAGE_URL}/objects/{path}',headers={**headers,'X-Storage-Key':key},**kwargs)
        r.raise_for_status();return r

@router.post('/profile/avatar')
async def upload_profile_avatar(file:UploadFile=File(...),p=Depends(require('operate'))):
    mime=file.content_type
    ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}.get(mime)
    if not ext: raise HTTPException(422,'Use uma imagem JPG, PNG ou WebP')
    data=await file.read(5*1024*1024+1)
    if not data or len(data)>5*1024*1024: raise HTTPException(422,'A imagem deve ter até 5 MB')
    valid=(mime=='image/jpeg' and data.startswith(b'\xff\xd8\xff')) or (mime=='image/png' and data.startswith(b'\x89PNG\r\n\x1a\n')) or (mime=='image/webp' and data[:4]==b'RIFF' and data[8:12]==b'WEBP')
    if not valid: raise HTTPException(422,'O conteúdo não corresponde ao formato da imagem')
    path=f"{os.environ['STORAGE_APP_NAME']}/profiles/{p['company_id']}/{p['id']}.{ext}"
    try: r=await storage_request('PUT',path,content=data,headers={'Content-Type':mime})
    except Exception: raise HTTPException(503,'Armazenamento indisponível. Tente novamente.')
    repo=Repo(p)
    await repo.update('users',{'id':p['id']},{'profile_image_path':r.json()['path'],'profile_image_type':mime})
    await audit(p,'profile_image_updated','Imagem de perfil atualizada')
    return {'ok':True,'profile_image_url':'/api/profile/avatar'}

@router.get('/profile/avatar')
async def download_profile_avatar(p=Depends(require('read'))):
    user=await Repo(p).one('users',{'id':p['id']},required=False)
    if not user or not user.get('profile_image_path'): raise HTTPException(404,'Imagem de perfil não configurada')
    try: r=await storage_request('GET',user['profile_image_path'])
    except Exception: raise HTTPException(503,'Não foi possível carregar a imagem de perfil')
    return Response(r.content,media_type=user.get('profile_image_type','image/jpeg'),headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'})

@router.post('/orders/{order_id}/attachments')
async def upload(order_id:str,file:UploadFile=File(...),p=Depends(require('operate'))):
    repo=Repo(p);await repo.one('orders',{'id':order_id})
    mime=file.content_type;ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}.get(mime)
    if not ext:raise HTTPException(422,'Use fotos JPG, PNG ou WebP')
    data=await file.read(10*1024*1024+1)
    if not data or len(data)>10*1024*1024:raise HTTPException(422,'A foto deve ter até 10 MB')
    valid=(mime=='image/jpeg' and data.startswith(b'\xff\xd8\xff')) or (mime=='image/png' and data.startswith(b'\x89PNG\r\n\x1a\n')) or (mime=='image/webp' and data[:4]==b'RIFF' and data[8:12]==b'WEBP')
    if not valid:raise HTTPException(422,'O conteúdo do arquivo não corresponde ao formato da imagem')
    path=f"{os.environ['STORAGE_APP_NAME']}/uploads/{p['company_id']}/{order_id}/{uid()}.{ext}"
    try:r=await storage_request('PUT',path,content=data,headers={'Content-Type':mime})
    except Exception:raise HTTPException(503,'Armazenamento indisponível. A foto não foi salva; tente novamente.')
    record=await repo.insert('attachments',{'order_id':order_id,'storage_path':r.json()['path'],'name':(file.filename or 'foto')[:200],'content_type':mime,'size':len(data),'is_deleted':False})
    await audit(p,'attachment_added',f"Foto {record['name']} anexada",order_id);return record

@router.get('/attachments/{attachment_id}')
async def download(attachment_id:str,p=Depends(require('read'))):
    f=await Repo(p).one('attachments',{'id':attachment_id,'is_deleted':False})
    try:r=await storage_request('GET',f['storage_path'])
    except Exception:raise HTTPException(503,'Não foi possível carregar a foto')
    return Response(r.content,media_type=f['content_type'],headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'})

@router.delete('/attachments/{attachment_id}')
async def delete(attachment_id:str,p=Depends(require('operate'))):
    repo=Repo(p);f=await repo.one('attachments',{'id':attachment_id,'is_deleted':False});await repo.update('attachments',{'id':attachment_id},{'is_deleted':True});await audit(p,'attachment_removed',f"Foto {f['name']} removida",f['order_id']);return {'ok':True}
