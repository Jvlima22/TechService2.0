from datetime import datetime,timezone,timedelta
from core import Repo,uid,audit
from auth_routes import hash_password

async def seed_demo(user):
    repo=Repo(user);now=datetime.now(timezone.utc)
    techs=[user]
    for name in ['Lucas Oliveira','Mariana Costa','Pedro Santos']:
        techs.append(await repo.insert('users',{'name':name,'email':name.split()[0].lower()+'@example.com','password_hash':hash_password(uid()),'role':'technician','active':True}))
    names=['Camila Rodrigues','Bruno Almeida','Juliana Ferreira','André Martins','Fernanda Lima','Gabriel Souza','Patrícia Mendes','Ricardo Alves','Ana Beatriz','Carlos Eduardo','Mariana Lopes','Thiago Ribeiro']
    items=['iPhone 13 Pro','Notebook Dell Inspiron','Samsung Galaxy S23','MacBook Air M1','PlayStation 5','iPhone 12','Notebook Lenovo IdeaPad','iPad Air 5','Samsung Galaxy A54','MacBook Pro','Impressora Epson L3250','iPhone 14']
    problems=['Tela trincada após queda. Touch funcionando parcialmente.','Equipamento não liga. LED de carga acende.','Bateria descarregando rapidamente.','Teclado com algumas teclas sem resposta.','Superaquecimento durante o uso.','Conector de carga com mau contato.','Tela apresenta linhas verticais.','Troca de película e avaliação geral.','Reparo na câmera traseira.','Limpeza preventiva e troca de pasta térmica.','Falha no sistema de alimentação de papel.','Troca do vidro traseiro.']
    states=['in_progress','awaiting','open','diagnosis','completed','in_progress','awaiting','delivered','completed','delivered','diagnosis','open']
    prices=[650,380,290,480,320,180,540,120,270,250,190,420]
    for i,name in enumerate(names):
        c=await repo.insert('clients',{'name':name,'email':name.split()[0].lower()+'@example.com','phone':'+5511999990000','document':'','notes':'','whatsapp_consent':False})
        item=await repo.insert('items',{'client_id':c['id'],'name':items[i],'fields':{}})
        created=(now-timedelta(days=i%7,hours=3+i)).isoformat(); status=states[i];tech=techs[(i%3)+1]
        paid=prices[i] if status=='delivered' else 100 if status=='completed' else 0
        o=await repo.insert('orders',{'number':await repo.counter(),'client_id':c['id'],'client_name':name,'item_id':item['id'],'item':items[i],'item_fields':{'brand':items[i].split()[0]},'custom_values':{},'problem':problems[i],'diagnosis':'Avaliação técnica realizada. Substituição do componente e testes funcionais.' if status not in ['open','diagnosis'] else '', 'quote':[{'description':'Serviço técnico e peças','quantity':1,'unit_price':prices[i]}] if status!='open' else [],'total':prices[i] if status!='open' else 0,'paid':paid,'payments':[{'id':uid(),'amount':paid,'method':'pix','at':(now-timedelta(days=i%5)).isoformat(),'actor':user['name']}] if paid else [],'status':status,'priority':'urgent' if i==0 else 'high' if i in [1,4] else 'normal','technician_id':tech['id'],'technician_name':tech['name'],'created_at':created,'updated_at':now.isoformat(),'due_date':(now+timedelta(days=i%4-1)).date().isoformat(),'version':1,**({'completed_at':(now-timedelta(days=max(0,i%7-2))).isoformat()} if status in ['completed','delivered'] else {})})
        await audit({**user,'name':tech['name']},'order_created',f"OS #{o['number']} · {items[i]} recebida",o['id'])