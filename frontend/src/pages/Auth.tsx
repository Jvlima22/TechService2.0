import React,{useState,useEffect} from 'react';
import {Link,useNavigate,useParams} from 'react-router-dom';
import {Laptop,Car,Wrench,Sparkles,ArrowRight,Check} from 'lucide-react';
import {api,errorText} from '../lib/api';
import {useSession} from '../lib/session';
import {useTheme} from '../lib/theme';
import {Field,Btn} from '../components/Common';
import {ThemeToggle} from '../components/ThemeToggle';

const niches=[['assistance','Assistência técnica',Laptop],['automotive','Oficina automotiva',Car],['maintenance','Manutenção',Wrench],['beauty','Estética e bem-estar',Sparkles]] as const;

export const Brand=()=>{
 const {logoSrc}=useTheme();
 return <Link to="/" className="brand" data-testid="auth-brand"><img className="brand-logo" src={logoSrc} alt="Tech Service"/><div>tech<span>service</span><small>WORKSPACE</small></div></Link>;
};

export default function Auth(){
 const {mode}=useParams();const registering=mode==='register';const [niche,setNiche]=useState('assistance'),[busy,setBusy]=useState(false),[error,setError]=useState('');const {save}=useSession();const navigate=useNavigate();
 useEffect(()=>setError(''),[mode]);
 const submit=async(e:any)=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.currentTarget));setBusy(true);setError('');try{const r=await api.post(registering?'/auth/register':'/auth/login',registering?{...body,niche}:body);save(r.data);navigate(r.data.user.role==='admin'?'/':'/orders');}catch(e){setError(errorText(e));}finally{setBusy(false);}};
 return <div className="auth-page"><div className="auth-theme-corner"><ThemeToggle/></div><div className="auth-form"><Brand/><h1 data-testid="auth-title">{registering?'Seu negócio. Tudo em ordem.':'Bom ter você de volta.'}</h1><p className="auth-subtitle" data-testid="auth-subtitle">{registering?'Crie o espaço de trabalho da sua empresa.':'Entre no seu espaço de trabalho.'}</p><form onSubmit={submit} key={mode}>{registering&&<><div className="niche-grid">{niches.map(([id,label,Icon])=><button type="button" key={id} className={`niche-option ${niche===id?'selected':''}`} data-testid={`niche-${id}`} onClick={()=>setNiche(id)}><Icon size={20}/><span>{label}</span>{niche===id&&<Check size={13} style={{marginLeft:'auto'}}/>}</button>)}</div><div className="form-grid"><Field label="Seu nome" id="auth-name" name="name" required minLength={2} placeholder="Nome completo"/><Field label="Nome da empresa" id="auth-company" name="company_name" required minLength={2} placeholder="Sua empresa"/></div></>}<Field label="E-mail" id="auth-email" name="email" type="email" required placeholder="voce@empresa.com.br"/><Field label="Senha" id="auth-password" name="password" type="password" minLength={registering?8:1} maxLength={64} required placeholder={registering?'Pelo menos 8 caracteres':'Sua senha'} autoComplete={registering?'new-password':'current-password'}/>{!registering&&<Field label="Código da empresa (se houver mais de uma conta)" id="auth-company-code" name="company_code" placeholder="Opcional"/>}{error&&<div className="error-alert" data-testid="auth-error">{error}</div>}<Btn testId="auth-submit" type="submit" disabled={busy}>{busy?'Aguarde...':registering?'Criar minha empresa':'Entrar na minha conta'}<ArrowRight size={15}/></Btn></form><div className="auth-bottom" data-testid="auth-alternative">{registering?'Já tem uma conta?':'Ainda não tem uma conta?'}<Link data-testid="auth-toggle" to={registering?'/auth/login':'/auth/register'}>{registering?'Entrar':'Criar minha empresa'}</Link></div><div className="auth-bottom"><Link data-testid="back-to-workspace" to="/">Voltar ao workspace</Link></div></div></div>;
}
