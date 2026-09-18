import logging
from fastapi import APIRouter, Request, HTTPException
from core import db, now, audit

router = APIRouter(prefix='/api/webhooks')

@router.post('/asaas')
async def asaas_webhook(request: Request):
    """
    Public webhook endpoint for receiving Asaas payment events.
    """
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(400, 'Payload JSON inválido')

    logging.info(f"Asaas Webhook received: {data}")

    event = data.get('event')
    payment = data.get('payment', {})
    external_ref = payment.get('externalReference', '')

    if event == 'PAYMENT_CONFIRMED' or event == 'PAYMENT_RECEIVED':
        if not external_ref.startswith('TS_ORDER_'):
            return {'status': 'ignored', 'message': 'Referência externa não reconhecida'}
            
        order_id = external_ref.replace('TS_ORDER_', '')
        
        # Encontra a OS no banco
        order = await db.orders.find_one({'id': order_id})
        if not order:
            logging.warning(f"OS não encontrada para o pagamento Asaas: {order_id}")
            return {'status': 'ignored', 'message': 'OS não encontrada'}
            
        company_id = order['company_id']
        
        # Atualiza a OS para 'paid' ou 'in_progress'
        # Como o plano menciona 'paid', vamos usar 'paid' e também deixar a OS pronta para in_progress
        await db.orders.update_one(
            {'id': order_id},
            {'$set': {'status': 'in_progress', 'updated_at': now()}} # Vamos usar in_progress direto que é o status que eles já tem
        )
        
        # Atualiza a tabela de payments
        await db.payments.update_one(
            {'checkout_id': payment.get('id')},
            {'$set': {'status': 'PAID', 'updated_at': now()}}
        )
        
        # Trilha de auditoria
        await db.audit.insert_one({
            'company_id': company_id,
            'actor': 'Asaas Gateway',
            'actor_id': 'asaas_system',
            'action': 'payment_confirmed',
            'description': f"Pagamento da OS {order.get('number')} confirmado via Asaas. OS movida para Execução.",
            'order_id': order_id,
            'created_at': now()
        })
        
        logging.info(f"Pagamento confirmado para a OS {order_id}")
        return {'status': 'success'}

    return {'status': 'received'}
