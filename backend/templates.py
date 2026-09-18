TEMPLATES = [
    {'id':'assistance','name':'Assistência técnica','item_label':'Equipamento','icon':'Laptop','fields':[{'id':'brand','name':'Marca','type':'text'},{'id':'model','name':'Modelo','type':'text'},{'id':'serial','name':'Número de série','type':'text'},{'id':'accessories','name':'Acessórios recebidos','type':'text'}]},
    {'id':'automotive','name':'Oficina automotiva','item_label':'Veículo','icon':'Car','fields':[{'id':'plate','name':'Placa','type':'text'},{'id':'model','name':'Modelo / ano','type':'text'},{'id':'mileage','name':'Quilometragem','type':'number'},{'id':'fuel','name':'Combustível','type':'select','options':['Flex','Gasolina','Diesel','Elétrico']}]},
    {'id':'maintenance','name':'Manutenção','item_label':'Imóvel / instalação','icon':'Wrench','fields':[{'id':'address','name':'Endereço do serviço','type':'text'},{'id':'area','name':'Área / setor','type':'text'},{'id':'type','name':'Tipo de manutenção','type':'select','options':['Preventiva','Corretiva','Instalação']}]},
    {'id':'beauty','name':'Estética e bem-estar','item_label':'Procedimento','icon':'Sparkles','fields':[{'id':'area','name':'Área de tratamento','type':'text'},{'id':'sessions','name':'Número de sessões','type':'number'},{'id':'restrictions','name':'Restrições / alergias','type':'text'}]},
]
STATUSES = {'open':'Aberta','diagnosis':'Em diagnóstico','awaiting':'Aguardando aprovação','awaiting_payment':'Aguardando pagamento','approved':'Aprovada','rejected':'Recusada','paid':'Paga','in_progress':'Em execução','completed':'Pronto','delivered':'Entregue','cancelled':'Cancelada'}
TRANSITIONS = {'open':['diagnosis','cancelled'],'diagnosis':['awaiting','cancelled'],'awaiting':['diagnosis','awaiting_payment','cancelled'],'awaiting_payment':['paid','cancelled'],'approved':['in_progress','cancelled'],'rejected':['diagnosis','cancelled'],'paid':['in_progress','cancelled'],'in_progress':['completed','cancelled'],'completed':['delivered','cancelled'],'delivered':[],'cancelled':[]}

def template(niche): return next(t for t in TEMPLATES if t['id'] == niche)

def validate_fields(values, fields):
    from fastapi import HTTPException
    from datetime import date
    allowed = {f['id']:f for f in fields}
    for key, value in values.items():
        if key not in allowed: raise HTTPException(422, 'Campo não permitido pelo template')
        f = allowed[key]
        if value in ('', None): continue
        try:
            if f['type'] == 'number':
                import math
                if not math.isfinite(float(value)): raise ValueError()
            elif f['type'] == 'date': date.fromisoformat(str(value))
            elif f['type'] == 'select':
                if value not in f.get('options', []): raise ValueError()
            elif not isinstance(value, str) or len(value) > 2000: raise ValueError()
        except (ValueError, TypeError): raise HTTPException(422, f"Valor inválido em {f['name']}")