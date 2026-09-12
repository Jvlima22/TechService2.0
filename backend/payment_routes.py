import os
import logging
from fastapi import APIRouter, Request, HTTPException, Depends
from core import db, now, Repo, principal, require, audit

router = APIRouter(prefix='/api/payment')

# Plan Limits Mapping
PLAN_LIMITS = {
    'starter': {'name': 'Starter', 'users_limit': 2, 'custom_fields_limit': 3},
    'pro': {'name': 'Pro', 'users_limit': 5, 'custom_fields_limit': 99},
    'enterprise': {'name': 'Enterprise', 'users_limit': 999, 'custom_fields_limit': 999}
}

@router.post('/webhooks/cakto')
async def cakto_webhook(request: Request):
    """
    Public webhook endpoint for receiving Cakto payment events.
    Supports purchase.approved, subscription.active, subscription.canceled, etc.
    """
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(400, 'Payload JSON inválido')

    logging.info(f"Cakto Webhook received: {data}")

    # Extract event type and status
    event = data.get('event') or data.get('type') or data.get('status')
    payload = data.get('data') or data

    # Extract company identifiers (custom_id, metadata, buyer email)
    custom_id = payload.get('custom_id') or payload.get('metadata', {}).get('company_id')
    company_code = payload.get('metadata', {}).get('company_code')
    buyer_email = payload.get('customer', {}).get('email') or payload.get('email')
    
    # Determine target plan
    product_name = str(payload.get('product', {}).get('name') or payload.get('offer_name') or '').lower()
    plan_id = 'pro'  # default fallback
    if 'starter' in product_name:
        plan_id = 'starter'
    elif 'enterprise' in product_name or 'corporativo' in product_name:
        plan_id = 'enterprise'
    elif 'pro' in product_name:
        plan_id = 'pro'

    # Find target company in DB
    company = None
    if custom_id:
        company = await db.companies.find_one({'id': custom_id})
    if not company and company_code:
        company = await db.companies.find_one({'code': company_code})
    if not company and buyer_email:
        user = await db.users.find_one({'email': str(buyer_email).lower()})
        if user:
            company = await db.companies.find_one({'id': user['company_id']})

    if not company:
        logging.warning(f"Cakto Webhook: Empresa não encontrada para custom_id={custom_id}, email={buyer_email}")
        return {'status': 'ignored', 'message': 'Empresa não encontrada no sistema'}

    company_id = company['id']
    limits = PLAN_LIMITS.get(plan_id, PLAN_LIMITS['pro'])

    # Handle payment approval or subscription activation
    approved_events = ['purchase.approved', 'subscription.active', 'paid', 'approved', 'active']
    canceled_events = ['subscription.canceled', 'purchase.refunded', 'canceled', 'refunded']

    if any(e in str(event).lower() for e in approved_events):
        await db.companies.update_one(
            {'id': company_id},
            {'$set': {
                'plan': plan_id,
                'plan_name': limits['name'],
                'plan_status': 'active',
                'users_limit': limits['users_limit'],
                'demo': False,
                'subscription_updated_at': now()
            }}
        )
        await db.audit.insert_one({
            'company_id': company_id,
            'actor': 'Cakto Gateway',
            'actor_id': 'cakto_system',
            'action': 'plan_activated',
            'description': f"Plano {limits['name']} ativado com sucesso via Cakto",
            'created_at': now()
        })
        logging.info(f"Plano {plan_id} ativado para empresa {company_id}")
        return {'status': 'success', 'message': f"Plano {plan_id} ativado"}

    elif any(e in str(event).lower() for e in canceled_events):
        await db.companies.update_one(
            {'id': company_id},
            {'$set': {
                'plan_status': 'canceled',
                'subscription_updated_at': now()
            }}
        )
        await db.audit.insert_one({
            'company_id': company_id,
            'actor': 'Cakto Gateway',
            'actor_id': 'cakto_system',
            'action': 'plan_canceled',
            'description': "Assinatura cancelada via Cakto",
            'created_at': now()
        })
        return {'status': 'success', 'message': 'Assinatura cancelada'}

    return {'status': 'received', 'event': event}


@router.get('/subscription')
async def get_subscription(p=Depends(require('settings'))):
    """
    Get current company subscription details and checkout URLs.
    """
    company = await db.companies.find_one({'id': p['company_id']}, {'_id': 0})
    if not company:
        raise HTTPException(404, 'Empresa não encontrada')

    plan_id = company.get('plan', 'starter' if company.get('demo') else 'pro')
    plan_info = PLAN_LIMITS.get(plan_id, PLAN_LIMITS['pro'])

    checkout_urls = {
        'starter': {
            'monthly': os.environ.get('CAKTO_CHECKOUT_STARTER_MONTHLY', 'https://pay.cakto.com.br/byvqwzf_1104578'),
            'annual': os.environ.get('CAKTO_CHECKOUT_STARTER_ANNUAL', 'https://pay.cakto.com.br/bed9jz4')
        },
        'pro': {
            'monthly': os.environ.get('CAKTO_CHECKOUT_PRO_MONTHLY', 'https://pay.cakto.com.br/d97ai8v_1104582'),
            'annual': os.environ.get('CAKTO_CHECKOUT_PRO_ANNUAL', 'https://pay.cakto.com.br/poqag6s')
        },
        'enterprise': {
            'monthly': os.environ.get('CAKTO_CHECKOUT_ENTERPRISE_MONTHLY', 'https://pay.cakto.com.br/34mt2ad_1104585'),
            'annual': os.environ.get('CAKTO_CHECKOUT_ENTERPRISE_ANNUAL', 'https://pay.cakto.com.br/bf7oo52')
        }
    }

    return {
        'company_id': company['id'],
        'company_name': company['name'],
        'plan_id': plan_id,
        'plan_name': plan_info['name'],
        'plan_status': company.get('plan_status', 'active'),
        'users_limit': company.get('users_limit', plan_info['users_limit']),
        'demo': company.get('demo', False),
        'checkout_urls': checkout_urls
    }
