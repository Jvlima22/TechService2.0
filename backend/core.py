import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / '.env')
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
JWT_SECRET = os.environ['JWT_SECRET']
bearer = HTTPBearer(auto_error=False)
def now(): return datetime.now(timezone.utc).isoformat()
def uid(): return str(uuid.uuid4())

class Repo:
    """All tenant-owned data access must pass this company-scoped repository."""
    def __init__(self, principal): self.p = principal; self.company_id = principal['company_id']
    def scope(self, query=None): return {'$and': [{'company_id': self.company_id}, query or {}]}
    async def find(self, collection, query=None, limit=2000, sort='created_at'):
        return await db[collection].find(self.scope(query), {'_id': 0}).sort(sort, -1).to_list(limit)
    async def one(self, collection, query=None, required=True):
        doc = await db[collection].find_one(self.scope(query), {'_id': 0})
        if not doc and required: raise HTTPException(404, 'Registro não encontrado')
        return doc
    async def insert(self, collection, values):
        doc = {**values, 'company_id': self.company_id}
        doc.setdefault('id', uid()); doc.setdefault('created_at', now())
        await db[collection].insert_one(dict(doc))
        return doc
    async def update(self, collection, query, values):
        return await db[collection].update_one(self.scope(query), {'$set': values})
    async def push_field(self, field):
        return await db.companies.update_one(self.scope({'$expr': {'$lt': [{'$size': '$custom_fields'}, 5]}}), {'$push': {'custom_fields': field}})
    async def counter(self):
        doc = await db.companies.find_one_and_update(self.scope(), {'$inc': {'counter': 1}}, projection={'_id': 0}, return_document=True)
        return doc['counter']

PERMISSIONS = {
    'admin': {'read', 'operate', 'finance', 'settings', 'users', 'audit'},
    'technician': {'read', 'operate'},
    'customer': {'approve'},
    'worker': {'notify', 'expire'},
}
def authorize(p, action):
    if action not in PERMISSIONS.get(p.get('role'), set()): raise HTTPException(403, 'Você não tem permissão para esta ação')

async def principal(auth: HTTPAuthorizationCredentials = Depends(bearer)):
    if not auth: raise HTTPException(401, 'Entre na sua conta')
    try:
        payload = jwt.decode(auth.credentials, JWT_SECRET, algorithms=['HS256'])
        if payload.get('scope') != 'session': raise ValueError()
    except Exception: raise HTTPException(401, 'Sessão inválida ou expirada')
    repo = Repo({'company_id': payload.get('company_id')})
    user = await repo.one('users', {'id': payload.get('sub'), 'active': True}, required=False)
    if not user: raise HTTPException(401, 'Sessão encerrada')
    return {'id': user['id'], 'name': user['name'], 'company_id': user['company_id'], 'role': user['role']}

def require(action):
    async def dep(p=Depends(principal)):
        authorize(p, action)
        return p
    return dep

async def audit(p, action, description, order_id=None, changes=None):
    await Repo(p).insert('audit', {'actor': p['name'], 'actor_id': p['id'], 'action': action, 'description': description, 'order_id': order_id, 'changes': changes or {}})

TECH_FIELDS = {'id','company_id','number','client_id','client_name','item','item_fields','custom_values','problem','diagnosis','quote','total','status','priority','technician_id','technician_name','due_date','created_at','updated_at','completed_at','version','approval_expires','approval_decision','cancel_reason'}
def order_view(order, p):
    if p['role'] == 'technician': return {k:v for k,v in order.items() if k in TECH_FIELDS}
    return {k:v for k,v in order.items() if k not in {'approval_hash','approval_jti'}}