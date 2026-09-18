import React,{useState,useEffect,useRef} from 'react';
import {NavLink,Outlet,useLocation,Link} from 'react-router-dom';
import {LayoutDashboard,ClipboardList,Users,Wallet,BarChart3,Settings,ChevronsUpDown,Bell,Search,Menu,LogOut,ShieldCheck,Command,PanelRightOpen,PanelLeftOpen,Activity,ArrowUpRight as AUR,X,User,ChevronRight,Zap} from 'lucide-react';
import {useSession} from '../lib/session';
import {Avatar,UserAvatar,IconBtn} from './Common';
import {GlobalSearch} from './GlobalSearch';

const navigation=[
 {to:'/',label:'Visão geral',icon:LayoutDashboard,admin:true},
 {to:'/orders',label:'Ordens de serviço',icon:ClipboardList},
 {to:'/clients',label:'Clientes',icon:Users},
 {to:'/finance',label:'Financeiro',icon:Wallet,admin:true},
 {to:'/reports',label:'Relatórios',icon:BarChart3,admin:true}
];

function date(s:string){
 const d=new Date(s);
 const now=new Date();
 const diff=Math.floor((now.getTime()-d.getTime())/1000);
 if(diff<60) return 'agora';
 if(diff<3600) return `${Math.floor(diff/60)}min atrás`;
 if(diff<86400) return `${Math.floor(diff/3600)}h atrás`;
 return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
}

function UserProfileDropdown({onClose,onLogout}:{onClose:()=>void,onLogout:()=>void}){
 const {session}=useSession();
 const isAdmin=session.user.role==='admin';
 const menuItems=[
  ...(isAdmin?[{to:'/plans',label:'Planos',icon:Zap,desc:'Gerenciar plano e recursos'}]:[]),
  ...(isAdmin?[{to:'/settings',label:'Configurações',icon:Settings,desc:'Empresa e integrações'}]:[]),
  ...(isAdmin?[{to:'/team',label:'Equipe',icon:Users,desc:'Gerenciar membros'}]:[]),
  ...(isAdmin?[{to:'/activity',label:'Atividade',icon:Activity,desc:'Histórico de ações'}]:[]),
 ];
 return (
  <div className="profile-dropdown">
   <div className="profile-dd-header">
    <UserAvatar name={session.user.name} id="dd-user-avatar"/>
    <div className="profile-dd-info">
     <strong>{session.user.name}</strong>
     <span>{isAdmin?'Administrador':'Técnico'}</span>
     <span className="profile-dd-email">{session.company.name}</span>
    </div>
   </div>
   <div className="profile-dd-menu">
    {menuItems.map(item=>(
     <Link key={item.to} to={item.to} className="profile-dd-item" onClick={onClose}>
      <span className="profile-dd-icon"><item.icon size={14}/></span>
      <div><strong>{item.label}</strong><span>{item.desc}</span></div>
      <ChevronRight size={13} className="profile-dd-arrow"/>
     </Link>
    ))}
   </div>
   <div className="profile-dd-footer">
    <button className="profile-dd-logout" onClick={()=>{onLogout();onClose();}}>
     <LogOut size={14}/> Sair da conta
    </button>
   </div>
  </div>
 );
}

function NotificationDropdown({onClose}:{onClose:()=>void}){
 const {session}=useSession();
 const [items,setItems]=useState<any[]>([]);
 const [loading,setLoading]=useState(true);

 useEffect(()=>{
  fetch('/api/audit',{headers:{'Authorization':`Bearer ${session.token}`}})
   .then(r=>r.json())
   .then(data=>{setItems(Array.isArray(data)?data.slice(0,8):[]); setLoading(false);})
   .catch(()=>setLoading(false));
 },[]);

 return (
  <div className="notif-dropdown">
   <div className="notif-header">
    <span className="notif-title"><Bell size={14}/>Notificações</span>
    <div style={{display:'flex',gap:6,alignItems:'center'}}>
     <Link to="/activity" className="notif-view-all" onClick={onClose}>Ver todas</Link>
     <button className="notif-close" onClick={onClose}><X size={14}/></button>
    </div>
   </div>
   <div className="notif-body">
    {loading&&<div className="notif-loading"><span className="spin" style={{display:'inline-block',width:14,height:14,border:'2px solid #333d55',borderTop:'2px solid #9880f8',borderRadius:'50%'}}/> Carregando...</div>}
    {!loading&&items.length===0&&<div className="notif-empty"><Activity size={22}/><span>Nenhuma atividade recente</span></div>}
    {!loading&&items.map((item:any,i:number)=>(
     <div key={item.id||i} className="notif-item">
      <span className="notif-icon"><Activity size={12}/></span>
      <div className="notif-content">
       <p>{item.description}</p>
       <span>{item.actor&&<b>{item.actor} · </b>}{date(item.created_at)}</span>
      </div>
     </div>
    ))}
   </div>
   <div className="notif-footer">
    <Link to="/activity" className="notif-footer-link" onClick={onClose}>
     Ver histórico completo <AUR size={11}/>
    </Link>
   </div>
  </div>
 );
}

export default function Layout(){
 const {session,logout}=useSession();
 const [mobile,setMobile]=useState(false);
 const [searchOpen,setSearchOpen]=useState(false);
 const [collapsed,setCollapsed]=useState(()=>localStorage.getItem('sidebar-collapsed')==='true');
 const [notifOpen,setNotifOpen]=useState(false);
 const [profileOpen,setProfileOpen]=useState(false);
 const notifRef=useRef<HTMLDivElement>(null);
 const profileRef=useRef<HTMLDivElement>(null);
 const location=useLocation();
 const isAdmin=session.user.role==='admin';
 const current=[...navigation,{to:'/team',label:'Equipe'},{to:'/plans',label:'Planos'},{to:'/settings',label:'Configurações'},{to:'/activity',label:'Atividade'}].find(n=>n.to==='/'?location.pathname==='/':location.pathname.startsWith(n.to));

 const toggleCollapsed=()=>{
  setCollapsed(prev=>{
   const next=!prev;
   localStorage.setItem('sidebar-collapsed',String(next));
   return next;
  });
 };

 // Close dropdowns on outside click
 useEffect(()=>{
  if(!notifOpen&&!profileOpen) return;
  const handler=(e:MouseEvent)=>{
   if(notifOpen&&notifRef.current&&!notifRef.current.contains(e.target as Node)) setNotifOpen(false);
   if(profileOpen&&profileRef.current&&!profileRef.current.contains(e.target as Node)) setProfileOpen(false);
  };
  document.addEventListener('mousedown',handler);
  return ()=>document.removeEventListener('mousedown',handler);
 },[notifOpen,profileOpen]);

 useEffect(()=>{
  const handleKeyDown=(e:KeyboardEvent)=>{
   if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){
    e.preventDefault();
    setSearchOpen(prev=>!prev);
   }
   if(e.key==='Escape'){setNotifOpen(false);setProfileOpen(false);}
  };
  window.addEventListener('keydown',handleKeyDown);
  return ()=>window.removeEventListener('keydown',handleKeyDown);
 },[]);

 return (
  <div className={`app-shell${collapsed?' sidebar-collapsed':''}`}>
   <div className={`mobile-shade${mobile?' visible':''}`} onClick={()=>setMobile(false)} data-testid="mobile-sidebar-overlay"/>
   <aside className={`sidebar${mobile?' sidebar-open':''}`}>
    <Link to="/" className="brand" data-testid="brand-link">
     <img className="brand-logo" src="/branding/tech-service-dark.png" alt="Tech Service"/>
     {!collapsed&&(
       <div className="brand-text">
         <div className="brand-title">
           <strong className="brand-tech">tech</strong>
           <span className="brand-service">service</span>
         </div>
         <small>WORKSPACE</small>
       </div>
     )}
    </Link>
    {!collapsed&&(
     <button className="company-switch" data-testid="company-settings-link" onClick={()=>{window.location.href=isAdmin?'/settings':'/orders';}}>
      <img src="/logo-alt.png" className="company-avatar" style={{objectFit: 'contain', backgroundColor: 'transparent'}} alt="TGL Solutions" />
      <div><strong>{session.company.name}</strong><span>{session.template.name}</span></div>
      <ChevronsUpDown size={15}/>
     </button>
    )}
    <div className="nav-label">{collapsed?'·':'PRINCIPAL'}</div>
    <nav>
     {navigation.filter(n=>!n.admin||isAdmin).map(n=>(
      <NavLink key={n.to} end={n.to==='/'} to={n.to} data-testid={`nav-${n.to==='/'?'dashboard':n.to.slice(1)}`} onClick={()=>setMobile(false)} className={({isActive})=>`nav-item${isActive?' active':''}`} title={n.label}>
       <n.icon size={19}/>
       {!collapsed&&<span>{n.label}</span>}
       {!collapsed&&n.to==='/orders'&&<span className="nav-live-dot"/>}
      </NavLink>
     ))}
    </nav>
    {isAdmin&&(
     <>
      <div className="nav-label management">{collapsed?'·':'GESTÃO'}</div>
      <nav>
       <NavLink to="/plans" data-testid="nav-plans" className="nav-item" onClick={()=>setMobile(false)} title="Planos"><Zap size={19}/>{!collapsed&&'Planos'}</NavLink>
       <NavLink to="/team" data-testid="nav-team" className="nav-item" onClick={()=>setMobile(false)} title="Equipe"><Users size={19}/>{!collapsed&&'Equipe'}</NavLink>
       <NavLink to="/settings" data-testid="nav-settings" className="nav-item" onClick={()=>setMobile(false)} title="Configurações"><Settings size={19}/>{!collapsed&&'Configurações'}</NavLink>
      </nav>
     </>
    )}
    <div className="sidebar-bottom">
     {!collapsed&&(
      <div className="workspace-status" data-testid="workspace-status">
       <ShieldCheck size={18}/>
       <div><strong>Seu espaço, protegido.</strong><span>Dados exclusivos da sua empresa</span></div>
       <i/>
      </div>
     )}
     <div className="user-profile">
      <UserAvatar name={session.user.name} id="current-user-avatar"/>
      {!collapsed&&<div><strong data-testid="current-user-name">{session.user.name}</strong><span data-testid="current-user-role">{isAdmin?'Administrador':'Técnico'}</span></div>}
      {!collapsed&&<IconBtn testId="logout-button" label="Sair da conta" onClick={logout}><LogOut size={17}/></IconBtn>}
     </div>
    </div>
   </aside>
   <div className="main-shell">
    <header className="topbar">
     <div className="breadcrumb">
      <IconBtn testId="mobile-menu-toggle" label="Abrir menu" onClick={()=>setMobile(!mobile)}><Menu size={20}/></IconBtn>
      <button className="sidebar-toggle-btn" onClick={toggleCollapsed} title={collapsed?'Expandir sidebar':'Recolher sidebar'} aria-label="Alternar sidebar">
       {collapsed?<PanelRightOpen size={18}/>:<PanelLeftOpen size={18}/>}
      </button>
      <span>Workspace</span>
      <span className="crumb-slash">/</span>
      <strong data-testid="breadcrumb-current">{current?.label||'Ordem de serviço'}</strong>
     </div>
     <div className="topbar-right">
      <button type="button" className="top-search" onClick={()=>setSearchOpen(true)} data-testid="global-search-link" aria-label="Buscar ordem de serviço">
       <Search size={17}/><span>Buscar ordem de serviço...</span><kbd className="search-kbd"><Command size={11}/>K</kbd>
      </button>
      <span className="topbar-separator"/>
      {isAdmin&&(
       <div className="notif-wrapper" ref={notifRef}>
        <button
         className={`notification-btn${notifOpen?' active':''}`}
         onClick={()=>setNotifOpen(o=>!o)}
         title="Notificações"
         data-testid="notifications-link"
         aria-label="Notificações"
        >
         <Bell size={19}/>
         <i className="notif-dot"/>
        </button>
        {notifOpen&&<NotificationDropdown onClose={()=>setNotifOpen(false)}/>}
       </div>
      )}
      <div className="profile-wrapper" ref={profileRef}>
        <button className={`profile-avatar-btn${profileOpen?' active':''}`} onClick={()=>setProfileOpen(o=>!o)} title="Perfil" aria-label="Menu do perfil">
        <UserAvatar name={session.user.name} size="small" id="topbar-user-avatar"/>
       </button>
       {profileOpen&&<UserProfileDropdown onClose={()=>setProfileOpen(false)} onLogout={logout}/>}
      </div>
     </div>
    </header>
    <main className="main-content"><Outlet/></main>
    <footer className="main-footer" data-testid="workspace-footer">
     <span>Tech Service <i/> Tudo em ordem.</span>
     <span><span className="connection-dot"/>Workspace conectado</span>
    </footer>
   </div>
   <GlobalSearch open={searchOpen} onClose={()=>setSearchOpen(false)}/>
  </div>
 );
}
