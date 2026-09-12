import React,{useState,useEffect} from 'react';
import {Link} from 'react-router-dom';
import {Plus,Save,MessageCircle,Mail,Cloud,Copy,ShieldCheck,Zap,ArrowUpRight} from 'lucide-react';
import {api,errorText} from '../lib/api';
import {useSession} from '../lib/session';
import {PageHead,Btn,Field,Modal,Select} from '../components/Common';
import {toast} from 'sonner';

export default function Settings(){
 const {session,refresh}=useSession();
 const [integrations,setIntegrations]=useState<any>({});
 const [open,setOpen]=useState(false);
 const [type,setType]=useState('text');
 const [busy,setBusy]=useState(false);

 useEffect(()=>{
  api.get('/integrations').then(r=>setIntegrations(r.data)).catch(e=>toast.error(errorText(e)));
 },[]);

 const field=async(e:any)=>{
  e.preventDefault();
  setBusy(true);
  const fd=new FormData(e.currentTarget);
  try{
   await api.post('/company/custom-fields',{name:fd.get('name'),type,options:type==='select'?String(fd.get('options')).split(',').map(s=>s.trim()).filter(Boolean):[]});
   await refresh();
   setOpen(false);
   toast.success('Campo personalizado adicionado');
  }catch(e){
   toast.error(errorText(e));
  }finally{
   setBusy(false);
  }
 };

 return (
  <>
   <PageHead title="Configurações" description="Seu espaço de trabalho, do seu jeito."/>
   <div className="settings-layout">
    {/* Plan Summary Section */}
    <section className="settings-band">
     <div className="section-heading">
      <div>
       <h2 data-testid="plan-settings-title" style={{display:'flex',alignItems:'center',gap:8}}>
        <Zap size={18} style={{color:'#8170f4'}}/> Plano & Assinatura
       </h2>
       <p style={{fontSize:11,color:'#8190a7',marginTop:4}}>Gerencie os limites de usuários, recursos e faturamento da sua empresa.</p>
      </div>
      <Link to="/plans" className="btn btn-primary btn-small" style={{display:'inline-flex',alignItems:'center',gap:6}}>
       Ver todos os planos <ArrowUpRight size={14}/>
      </Link>
     </div>
     <div className="plan-settings-card">
      <div className="psc-info">
       <span className="psc-badge">{session.company.demo?'Plano Starter':'Plano Pro'}</span>
       <strong>{session.company.name}</strong>
       <span>Recursos e limites ativos para sua equipe</span>
      </div>
      <div className="psc-limits">
       <div><span>Usuários</span><strong>Até 5 usuários</strong></div>
       <div><span>Campos customizados</span><strong>{session.company.custom_fields.length}/5 ativos</strong></div>
       <div><span>Suporte</span><strong>Prioritário WhatsApp</strong></div>
      </div>
     </div>
    </section>

    <section className="settings-band">
     <h2 data-testid="company-settings-title">Dados da empresa</h2>
     <p data-testid="company-access-code">Código de acesso: <strong>{session.company.code}</strong></p>
     <form onSubmit={async e=>{
      e.preventDefault();
      setBusy(true);
      try{
       await api.put('/company',{name:new FormData(e.currentTarget).get('name')});
       await refresh();
       toast.success('Empresa atualizada');
      }catch(e){
       toast.error(errorText(e));
      }finally{
       setBusy(false);
      }
     }}>
      <div className="form-grid">
       <Field id="company-name-setting" label="Nome da empresa" name="name" defaultValue={session.company.name} required minLength={2}/>
       <Field id="company-niche-setting" label="Nicho" value={session.template.name} disabled/>
      </div>
      <Btn testId="save-company-settings" type="submit" disabled={busy} style={{marginTop:18}}>
       <Save size={14}/>Salvar alterações
      </Btn>
     </form>
    </section>

    <section className="settings-band">
     <div className="section-heading">
      <div>
       <h2 data-testid="custom-fields-title">Campos personalizados <span className="count-pill">{session.company.custom_fields.length}/5</span></h2>
      </div>
      <Btn secondary testId="add-custom-field" disabled={session.company.custom_fields.length>=5} onClick={()=>setOpen(true)}>
       <Plus size={14}/>Adicionar campo
      </Btn>
     </div>
     <p data-testid="template-name-setting">Template ativo: {session.template.name} · {session.template.item_label}</p>
     <div className="field-list">
      {session.template.fields.map((f:any)=><div key={f.id} data-testid={`template-field-${f.id}`}><strong>{f.name}</strong><span>Template · {{text:'Texto',number:'Número',date:'Data',select:'Lista'}[f.type]}</span></div>)}
      {session.company.custom_fields.map((f:any)=><div key={f.id} data-testid={`custom-field-${f.id}`}><strong>{f.name}</strong><span>Personalizado · {{text:'Texto',number:'Número',date:'Data',select:'Lista'}[f.type]}</span></div>)}
     </div>
    </section>

    <section className="settings-band">
     <h2 data-testid="integrations-settings-title">Conexões da empresa</h2>
     <p data-testid="integrations-settings-subtitle">Status dos serviços de comunicação e armazenamento.</p>
     <div className="integration-grid">
      {[{id:'whatsapp',label:'WhatsApp · Twilio',Icon:MessageCircle},{id:'email',label:'E-mail · Resend',Icon:Mail},{id:'storage',label:'Armazenamento de fotos',Icon:Cloud}].map(({id,label,Icon})=>(
       <div className="integration-card" key={id}>
        <Icon size={23}/>
        <h3>{label}</h3>
        <span className={integrations[id]?'connected':'not-configured'} data-testid={`integration-status-${id}`}>
         {integrations[id]?'● Configurado':'● Não configurado'}
        </span>
       </div>
      ))}
     </div>
     {(!integrations.email||!integrations.whatsapp)&&(
      <div className="info-alert mt" data-testid="notifications-config-warning">
       <ShieldCheck size={17}/>
       <span>WhatsApp e e-mail aguardam credenciais do provedor. As ordens registram os envios pendentes e suas falhas; nenhum envio é marcado como entregue sem confirmação.</span>
      </div>
     )}
    </section>
   </div>

   <Modal open={open} onClose={()=>setOpen(false)} title="Novo campo personalizado" id="custom-field-modal">
    <form onSubmit={field} className="form-stack">
     <Field id="custom-field-name" label="Nome do campo" name="name" required minLength={2} placeholder="Ex.: Número do patrimônio"/>
     <Field id="custom-field-type" label="Tipo de informação">
      <Select id="custom-field-type" value={type} onChange={(e:any)=>setType(e.target.value)}>
       <option value="text">Texto</option>
       <option value="number">Número</option>
       <option value="date">Data</option>
       <option value="select">Lista de opções</option>
      </Select>
     </Field>
     {type==='select'&&<Field id="custom-field-options" label="Opções separadas por vírgula" name="options" required placeholder="Opção A, Opção B, Opção C"/>}
     <div className="form-actions">
      <Btn type="submit" testId="save-custom-field" disabled={busy}>Adicionar campo</Btn>
     </div>
    </form>
   </Modal>
  </>
 );
}