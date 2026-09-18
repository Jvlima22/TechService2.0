import React,{useState,useEffect} from 'react';
import {Plus,Save,MessageCircle,Mail,Cloud,Copy,ShieldCheck,Zap,ArrowUpRight,Camera,UserRound,QrCode,CreditCard,RefreshCw,LockKeyhole,FileText,Webhook,ChevronRight,CheckCircle2,AlertCircle} from 'lucide-react';
import {api,errorText} from '../lib/api';
import {useSession} from '../lib/session';
import {PageHead,Btn,Field,Modal,Select} from '../components/Common';
import {toast} from 'sonner';

export default function Settings(){
 const {session,refresh}=useSession();
 const [integrations,setIntegrations]=useState<any>({});
 const [paymentSettings,setPaymentSettings]=useState<any>({pix_key_type:'cpf_cnpj',pix_key:'',gateway_provider:'none',gateway_auth_method:'token',gateway_api_key:'',gateway_connected:false});
 const [open,setOpen]=useState(false);
 const [type,setType]=useState('text');
 const [busy,setBusy]=useState(false);
 const [profileImage,setProfileImage]=useState('');
 const [profileBusy,setProfileBusy]=useState(false);
 const [activeTab,setActiveTab]=useState('general');
 const [audit,setAudit]=useState<any[]>([]);

 useEffect(()=>{
  api.get('/integrations').then(r=>setIntegrations(r.data)).catch(e=>toast.error(errorText(e)));
  api.get('/payment-settings').then(r=>setPaymentSettings((s:any)=>({...s,...r.data}))).catch(e=>toast.error(errorText(e)));
  api.get('/audit').then(r=>setAudit(Array.isArray(r.data)?r.data:[])).catch(()=>{});
 },[]);

 useEffect(()=>{const params=new URLSearchParams(window.location.search);if(params.get('status')==='connected'){toast.success(`${params.get('oauth')==='stripe'?'Stripe':'Mercado Pago'} conectado via OAuth`);window.history.replaceState({},'',window.location.pathname);}},[]);

 useEffect(()=>{
  let objectUrl='';
  api.get('/profile/avatar',{responseType:'blob'}).then(r=>{objectUrl=URL.createObjectURL(r.data);setProfileImage(objectUrl);}).catch(()=>{});
  return ()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[session.user.profile_image_url]);

 const uploadProfileImage=async(e:any)=>{
  const file=e.target.files?.[0];
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast.error('Use uma imagem JPG, PNG ou WebP');e.target.value='';return;}
  if(file.size>5*1024*1024){toast.error('A imagem deve ter até 5 MB');e.target.value='';return;}
  setProfileBusy(true);
  try{
   const fd=new FormData();fd.append('file',file);
   await api.post('/profile/avatar',fd,{headers:{'Content-Type':'multipart/form-data'}});
   const preview=URL.createObjectURL(file);setProfileImage(preview);
   await refresh();
   toast.success('Imagem de perfil atualizada');
  }catch(error){toast.error(errorText(error));}
  finally{setProfileBusy(false);e.target.value='';}
 };

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
 const savePayments=async(e:any)=>{
  e.preventDefault();setBusy(true);
  try{const fd=new FormData(e.currentTarget);const r=await api.put('/payment-settings',{pix_key_type:fd.get('pix_key_type'),pix_key:fd.get('pix_key'),gateway_provider:fd.get('gateway_provider'),gateway_auth_method:fd.get('gateway_auth_method'),gateway_api_key:fd.get('gateway_api_key')});setPaymentSettings((s:any)=>({...s,...r.data,gateway_api_key:''}));toast.success('Configurações de recebimento salvas');}
  catch(e){toast.error(errorText(e));}finally{setBusy(false);}
 };
 const startOAuth=async(provider:string)=>{try{const r=await api.get(`/payment-oauth/${provider}/start`);window.location.href=r.data.authorization_url;}catch(e){toast.error(errorText(e));}};

 const tabs=[{id:'general',label:'Geral',icon:UserRound},{id:'receipts',label:'Recebimentos',icon:QrCode},{id:'integrations',label:'Integrações',icon:Webhook},{id:'security',label:'Segurança',icon:LockKeyhole},{id:'logs',label:'Logs',icon:RefreshCw},{id:'plans',label:'Planos',icon:Zap}];
 return (
  <>
   <div className="settings-breadcrumb"><span>Configurações</span><ChevronRight size={14}/><strong>{tabs.find(t=>t.id===activeTab)?.label}</strong></div>
   <div className="settings-page-header"><div><span className="settings-eyebrow">WORKSPACE</span><h1>Configurações</h1><p>Gerencie sua empresa, recebimentos e conexões em um só lugar.</p></div></div>
   <div className="settings-tabs" role="tablist">{tabs.map(({id,label,icon:Icon})=><button key={id} type="button" role="tab" aria-selected={activeTab===id} className={activeTab===id?'active':''} onClick={()=>setActiveTab(id)}><Icon size={15}/>{label}</button>)}</div>
   <div className="settings-page" data-active-tab={activeTab}>
   <div className="settings-layout">
    <section className="settings-band profile-settings-band" data-settings-section="general">
     <div className="section-heading">
      <div>
       <h2 data-testid="profile-settings-title"><UserRound size={18} style={{color:'#8170f4'}}/> Meu perfil</h2>
       <p style={{fontSize:11,color:'#8190a7',marginTop:4}}>Personalize a imagem exibida na sua conta e no workspace.</p>
      </div>
     </div>
     <div className="profile-upload-card">
      <div className="profile-upload-avatar">{profileImage?<img src={profileImage} alt={`Foto de ${session.user.name}`}/>:<span>{session.user.name?.split(' ').slice(0,2).map((n:string)=>n[0]).join('').toUpperCase()}</span>}<label className="profile-upload-trigger" htmlFor="profile-image-upload" title="Enviar imagem de perfil"><Camera size={14}/><input id="profile-image-upload" data-testid="profile-image-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadProfileImage} disabled={profileBusy}/></label></div>
      <div className="profile-upload-copy"><strong>{session.user.name}</strong><span>{session.user.email}</span><small>JPG, PNG ou WebP · até 5 MB</small></div>
      <label className="profile-upload-button">{profileBusy?'Enviando...':'Escolher imagem'}<input id="profile-image-upload-button" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadProfileImage} disabled={profileBusy}/></label>
     </div>
    </section>
    <section className="settings-band company-overview-band" data-settings-section="general">
     <div className="section-heading"><div><h2 data-testid="general-company-title"><FileText size={18} style={{color:'#8170f4'}}/> Empresa logada</h2><p style={{fontSize:11,color:'#8190a7',marginTop:4}}>Confira os dados do workspace atual e altere as informações permitidas.</p></div></div>
     <form onSubmit={async e=>{e.preventDefault();setBusy(true);try{const fd=new FormData(e.currentTarget);await api.put('/company',{name:fd.get('company-name')});await refresh();toast.success('Dados da empresa atualizados');}catch(e){toast.error(errorText(e));}finally{setBusy(false);}}}>
      <div className="company-overview-grid"><Field id="general-company-name" label="Nome da empresa" name="company-name" defaultValue={session.company.name} required minLength={2}/><Field id="general-company-code" label="Código de acesso" value={session.company.code} disabled/><Field id="general-company-niche" label="Nicho de atuação" value={session.template.name} disabled/><Field id="general-company-counter" label="Próxima numeração de OS" value={`#${Number(session.company.counter||1000)+1}`} disabled/></div>
      <div className="company-readonly-grid"><div><span>Administrador responsável</span><strong>{session.user.name}</strong><small>{session.user.email}</small></div><div><span>Perfil de acesso</span><strong>{session.user.role==='admin'?'Administrador':'Técnico'}</strong><small>Acesso vinculado a este workspace</small></div><div><span>Status da empresa</span><strong className="connected">Ativa</strong><small>{session.company.demo?'Ambiente de demonstração':'Conta operacional'}</small></div></div>
      <Btn testId="save-general-company" type="submit" disabled={busy} style={{marginTop:18}}><Save size={14}/>Salvar dados editáveis</Btn>
     </form>
    </section>
    {/* Plan Summary Section */}
    <section className="settings-band" data-settings-section="plans">
     <div className="section-heading">
      <div>
       <h2 data-testid="plan-settings-title" style={{display:'flex',alignItems:'center',gap:8}}>
        <Zap size={18} style={{color:'#8170f4'}}/> Plano & Assinatura
       </h2>
       <p style={{fontSize:11,color:'#8190a7',marginTop:4}}>Gerencie os limites de usuários, recursos e faturamento da sua empresa.</p>
      </div>
      <button type="button" className="btn btn-primary btn-small" onClick={()=>setActiveTab('plans')} style={{display:'inline-flex',alignItems:'center',gap:6}}>
       Ver detalhes do plano <ArrowUpRight size={14}/>
      </button>
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

    <section className="settings-band" data-settings-section="general">
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

    <section className="settings-band" data-settings-section="general">
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

    <section className="settings-band payment-settings-band" data-settings-section="receipts">
     <div className="section-heading"><div><h2 data-testid="payment-settings-title"><QrCode size={18} style={{color:'#60c2a5'}}/> Recebimentos</h2><p style={{fontSize:11,color:'#8190a7',marginTop:4}}>Pix direto sem taxa ou gateway para cartão e confirmação automática.</p></div></div>
     <form onSubmit={savePayments} className="payment-settings-form">
      <div className="payment-mode-card"><div className="payment-mode-icon"><QrCode size={20}/></div><div><strong>Pix direto</strong><span>O cliente paga diretamente na conta da empresa e a OS pode ser confirmada manualmente.</span></div><span className="connected">Sem taxa</span></div>
      <div className="form-grid"><Field id="pix-key-type" label="Tipo de chave Pix"><Select id="pix-key-type" name="pix_key_type" defaultValue={paymentSettings.pix_key_type}><option value="cpf_cnpj">CPF/CNPJ</option><option value="email">E-mail</option><option value="phone">Celular</option><option value="random">Chave aleatória</option></Select></Field><Field id="pix-key" label="Chave Pix" name="pix_key" defaultValue={paymentSettings.pix_key} placeholder="Informe a chave que receberá os pagamentos"/></div>
      <div className="payment-mode-card gateway-card"><div className="payment-mode-icon amber"><CreditCard size={20}/></div><div><strong>Gateway de pagamento</strong><span>Conecte Asaas, Mercado Pago ou Stripe por OAuth ou token de acesso.</span></div><span className={paymentSettings.gateway_connected?'connected':'not-configured'}>{paymentSettings.gateway_connected?'Conectado':'Opcional'}</span></div>
      <div className="form-grid"><Field id="gateway-provider" label="Provedor"><Select id="gateway-provider" name="gateway_provider" defaultValue={paymentSettings.gateway_provider}><option value="none">Não conectar agora</option><option value="asaas">Asaas</option><option value="mercadopago">Mercado Pago</option><option value="stripe">Stripe</option></Select></Field><Field id="gateway-auth-method" label="Método de conexão"><Select id="gateway-auth-method" name="gateway_auth_method" defaultValue={paymentSettings.gateway_auth_method}><option value="token">Token de acesso</option><option value="oauth">OAuth</option></Select></Field></div>
      <div className="gateway-auth-actions"><Field id="gateway-api-key" label="Token de acesso" name="gateway_api_key" type="password" placeholder={paymentSettings.gateway_connected?'Token já cadastrado · informe apenas para substituir':'Cole o token de acesso do gateway'}/><div className="oauth-actions"><span>Login seguro sem colar credenciais</span><div><button type="button" className="btn btn-secondary btn-small" onClick={()=>startOAuth('mercadopago')}>Conectar Mercado Pago</button><button type="button" className="btn btn-secondary btn-small" onClick={()=>startOAuth('stripe')}>Conectar Stripe</button></div></div></div>
      <p className="payment-security-note"><LockKeyhole size={13}/> As credenciais são enviadas somente ao backend e nunca ficam expostas no navegador.</p>
      <Btn testId="save-payment-settings" type="submit" disabled={busy} style={{marginTop:18}}><Save size={14}/>Salvar recebimentos</Btn>
     </form>
    </section>

    <section className="settings-band" data-settings-section="integrations">
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

    <section className="settings-band security-settings-band" data-settings-section="security">
     <div className="settings-card-heading"><div><span className="settings-eyebrow">SEGURANÇA</span><h2><LockKeyhole size={18}/> Validação de saque via Webhook</h2></div><span className="status-disabled">Desabilitado</span></div>
     <p className="settings-help">Ao habilitar este recurso, um Webhook será enviado para sua aplicação autorizar cada saque solicitado, adicionando uma camada extra de segurança e controle financeiro.</p>
     <div className="security-status"><span>Situação</span><strong>Desabilitado</strong></div>
     <div className="form-grid security-fields"><Field id="webhook-url" label="URL do Webhook" placeholder="Informe a URL para validação de saque" disabled/><Field id="webhook-email" label="E-mail para notificação de erros" placeholder="Informe um e-mail para notificação de erros" disabled/><Field id="webhook-token" label="Token de autenticação (Opcional)" placeholder="Defina um token de autenticação" disabled/></div>
     <div className="security-option"><input type="checkbox" disabled/><span>Validar também saques via interface.</span><AlertCircle size={14}/></div>
     <div className="settings-note"><AlertCircle size={14}/> Configure um endpoint seguro para ativar a validação. Este recurso ficará disponível quando o webhook financeiro for conectado.</div>
     <button type="button" className="btn btn-primary" disabled><ShieldCheck size={14}/>Habilitar validação</button>
    </section>

    <section className="settings-band logs-settings-band" data-settings-section="logs">
     <div className="section-heading"><div><span className="settings-eyebrow">AUDITORIA</span><h2><RefreshCw size={18}/> Logs de requisições e eventos</h2><p>Histórico das ações realizadas no workspace.</p></div></div>
     <div className="logs-table"><div className="logs-table-head"><span>Evento</span><span>Responsável</span><span>Data</span><span>Status</span></div>{audit.slice(0,12).map((item:any)=><div className="logs-row" key={item.id}><div><strong>{item.description||item.action}</strong><small>{item.action||'evento'}</small></div><span>{item.actor||'Sistema'}</span><span>{item.created_at?new Date(item.created_at).toLocaleString('pt-BR'):'—'}</span><b><CheckCircle2 size={14}/>Registrado</b></div>)}{!audit.length&&<div className="logs-empty"><FileText size={20}/>Nenhum evento registrado.</div>}</div>
    </section>
   </div>
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
