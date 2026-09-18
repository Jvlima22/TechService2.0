from html import escape
import os
from decimal import Decimal

STATUS_LABELS = {
    'open': ('OS aberta', 'Sua ordem de serviço foi registrada.'),
    'diagnosis': ('Em diagnóstico', 'Nossa equipe está analisando o equipamento.'),
    'awaiting': ('Aguardando aprovação', 'Seu orçamento está pronto para análise.'),
    'approved': ('Orçamento aprovado', 'O serviço foi aprovado e seguirá para execução.'),
    'awaiting_payment': ('Aguardando pagamento', 'Conclua o pagamento para liberarmos a próxima etapa.'),
    'paid': ('Pagamento confirmado', 'Recebemos o pagamento referente à sua ordem.'),
    'in_progress': ('Em execução', 'O serviço está sendo realizado pela nossa equipe.'),
    'completed': ('Serviço concluído', 'O reparo foi concluído e está pronto para retirada ou entrega.'),
    'delivered': ('OS finalizada', 'A ordem de serviço foi finalizada.'),
    'cancelled': ('OS cancelada', 'A ordem de serviço foi cancelada.'),
    'rejected': ('Orçamento recusado', 'O orçamento não foi aprovado.'),
}


def money(value):
    return f"R$ {float(value or 0):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')


def email_content(company, client, order, link='', custom_text=None):
    company_name = escape(company.get('name', 'Tech Service'))
    client_name = escape(client.get('name', 'Cliente'))
    number = escape(str(order.get('number', '')))
    status = order.get('status', '')
    title, subtitle = STATUS_LABELS.get(status, ('Atualização da ordem de serviço', 'Há uma nova atualização sobre sua OS.'))
    total = money(order.get('total', 0))
    paid = money(order.get('paid', 0))
    balance = money((order.get('total', 0) or 0) - (order.get('paid', 0) or 0))
    item = escape(order.get('item', 'Serviço técnico'))
    problem = escape(order.get('problem', ''))
    safe_link = escape(link, quote=True)
    cta = f'<a href="{safe_link}" style="display:inline-block;background:#155eef;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px;padding:13px 22px;">Ver orçamento e aprovar</a>' if link else ''
    custom = f'<div style="margin:24px 0;padding:16px 18px;background:#f4f7fb;border-left:4px solid #155eef;border-radius:6px;color:#334155;line-height:1.6;">{escape(custom_text)}</div>' if custom_text else ''
    base = (company.get('public_url') or os.environ.get('APP_URL') or '').rstrip('/')
    logo_url = escape(company.get('email_logo_url') or os.environ.get('EMAIL_LOGO_URL') or 'https://res.cloudinary.com/ditlmzgrh/image/upload/v1789755842/ChatGPT_Image_18_de_set._de_2026_15_18_05_xjkgrb.png', quote=True)
    html = f'''<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#172033;"><div style="padding:32px 12px;"><div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e5eaf1;border-radius:14px;overflow:hidden;box-shadow:0 5px 20px rgba(15,23,42,.06);"><div style="background:#071a3a;padding:22px 30px;text-align:left;"><img src="{logo_url}" alt="{company_name}" style="display:block;max-width:210px;max-height:62px;width:auto;height:auto;"></div><div style="padding:32px 30px 26px;"><div style="font-size:12px;color:#64748b;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:12px;">Atualização da OS #{number}</div><h1 style="font-size:25px;line-height:1.25;margin:0 0 8px;color:#0f172a;">Olá, {client_name}.</h1><p style="font-size:16px;line-height:1.55;color:#526174;margin:0 0 24px;">{subtitle}</p><div style="background:#eef5ff;border:1px solid #d6e5ff;border-radius:10px;padding:16px 18px;margin-bottom:24px;"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#55729d;font-weight:700;margin-bottom:7px;">Status atual</div><div style="font-size:19px;font-weight:700;color:#155eef;">{escape(title)}</div></div>{custom}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 22px;"><tr><td style="padding:12px 0;border-bottom:1px solid #edf0f4;color:#64748b;font-size:13px;">Equipamento / serviço</td><td style="padding:12px 0;border-bottom:1px solid #edf0f4;text-align:right;font-weight:700;font-size:13px;">{item}</td></tr><tr><td style="padding:12px 0;border-bottom:1px solid #edf0f4;color:#64748b;font-size:13px;">Valor total</td><td style="padding:12px 0;border-bottom:1px solid #edf0f4;text-align:right;font-weight:700;font-size:13px;">{total}</td></tr><tr><td style="padding:12px 0;color:#64748b;font-size:13px;">Saldo pendente</td><td style="padding:12px 0;text-align:right;font-weight:700;color:#155eef;font-size:13px;">{balance}</td></tr></table>{f'<p style="font-size:14px;color:#526174;line-height:1.55;"><strong>Descrição:</strong> {problem}</p>' if problem else ''}<div style="text-align:center;margin:28px 0 6px;">{cta}</div></div><div style="background:#f8fafc;border-top:1px solid #edf0f4;padding:20px 30px;text-align:center;color:#64748b;font-size:12px;line-height:1.6;">Este é um aviso automático da <strong style="color:#172033;">{company_name}</strong>.<br>Se precisar de ajuda, responda a este e-mail ou entre em contato com nossa equipe.</div></div><div style="max-width:620px;margin:14px auto 0;text-align:center;color:#94a3b8;font-size:11px;">Enviado por Tech Service</div></div></body></html>'''
    text = custom_text or f"Olá, {client.get('name','Cliente')}!\n\n{subtitle}\n\nOS #{order.get('number','')}\nStatus: {title}\nServiço: {order.get('item','')}\nValor total: {total}\nSaldo pendente: {balance}\n"
    return html, text, f'{title} · OS #{order.get("number","")}'
