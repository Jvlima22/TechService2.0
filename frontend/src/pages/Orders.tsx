import React,{useState,useEffect} from 'react';
import {useSearchParams,useNavigate} from 'react-router-dom';
import {Plus,LayoutGrid,List,Clock,User,AlertTriangle,Zap,FolderOpen,FileText,MoreHorizontal,ChevronRight,Play,Send,CheckCircle2,Truck,Eye} from 'lucide-react';
import {api,Order,date,money,errorText,statuses,transitions} from '../lib/api';
import {useSession} from '../lib/session';
import {PageHead,Btn,SearchBox,Avatar,Select,Loading,Empty} from '../components/Common';
import {OrderTable} from '../components/OrderTable';
import {OrderForm} from '../components/OrderForm';
import {toast} from 'sonner';

type Column = {id:string;label:string;statuses:string[];color:string;shortLabel:string};

const kanbanColumns:Column[] = [
  {id:'entry',label:'Entrada / Diagnóstico',shortLabel:'Entrada',statuses:['open','diagnosis'],color:'#638aff'},
  {id:'quote',label:'Orçamento',shortLabel:'Orçamento',statuses:['awaiting','awaiting_payment','approved'],color:'#edb55c'},
  {id:'maintenance',label:'Em manutenção',shortLabel:'Manutenção',statuses:['paid','in_progress'],color:'#a37cec'},
  {id:'ready',label:'Pronto',shortLabel:'Pronto',statuses:['completed'],color:'#38cf9b'},
  {id:'delivered',label:'Entregue',shortLabel:'Entregue',statuses:['delivered'],color:'#90a2b6'}
];

const statusColors:Record<string,string> = {
  open:'#638aff',diagnosis:'#bb80e8',awaiting:'#edb55c',awaiting_payment:'#f4a261',approved:'#38cf9b',
  paid:'#4cd18c',in_progress:'#a37cec',completed:'#38cf9b',delivered:'#90a2b6',rejected:'#f0788b',cancelled:'#f0788b'
};

const actionLabels:Record<string,string>={diagnosis:'Iniciar diagnóstico',awaiting:'Enviar para aprovação',awaiting_payment:'Confirmar pagamento',paid:'Iniciar execução',in_progress:'Iniciar execução',completed:'Concluir serviço',delivered:'Registrar entrega'};
const actionIcons:Record<string,any>={diagnosis:Play,awaiting:Send,awaiting_payment:CheckCircle2,paid:Play,in_progress:Play,completed:CheckCircle2,delivered:Truck};

function FolderCard({order,column,onOpen,menuOpen,onToggleMenu,onAction,busy}:{order:Order;column:Column;onOpen:()=>void;menuOpen:boolean;onToggleMenu:()=>void;onAction:(status:string)=>void;busy:boolean}){
  const accent=statusColors[order.status]||column.color;
  const isOverdue=Boolean(order.due_date&&new Date(order.due_date).getTime()<Date.now());
  const client=(order.client_name||'Cliente não informado').split(' ').map((n:string)=>n.charAt(0).toUpperCase()+n.slice(1).toLowerCase()).join(' ');
  const priorityLabel=order.priority==='urgent'?'Urgente':order.priority==='high'?'Alta':'';
  const nextActions=(transitions[order.status]||[]).filter(next=>next!=='cancelled');
  return <article
    className="order-folder-card"
    data-testid={`folder-order-${order.number}`}
    onClick={onOpen}
    onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onOpen();}}}
    role="button"
    tabIndex={0}
    aria-label={`Abrir ordem ${order.number}`}
    style={{'--folder-accent':accent} as React.CSSProperties}
  >
    <span className="folder-tab" aria-hidden="true" />
    <span className="folder-card-top">
      <span className="folder-number">OS #{order.number}</span>
      <span className="folder-menu-wrap">
        <button type="button" className={`folder-menu${menuOpen?' active':''}`} aria-label={`Gerir OS ${order.number}`} aria-expanded={menuOpen} onClick={(e)=>{e.stopPropagation();onToggleMenu();}}><MoreHorizontal size={15}/></button>
        {menuOpen&&<div className="folder-actions-menu" onClick={(e)=>e.stopPropagation()}>
          <button type="button" className="folder-action-item" disabled={busy} onClick={onOpen}><Eye size={13}/>Abrir detalhes</button>
          {nextActions.map(next=>{const Icon=actionIcons[next]||ChevronRight;return <button type="button" className="folder-action-item" disabled={busy} key={next} onClick={()=>onAction(next)}><Icon size={13}/>{busy?'Atualizando...':actionLabels[next]||statuses[next]}</button>;})}
        </div>}
      </span>
    </span>
    <span className="folder-icon-wrap" aria-hidden="true"><FolderOpen size={25} strokeWidth={1.7}/></span>
    <span className="folder-card-content">
      <strong className="folder-item">{order.item||'Serviço sem título'}</strong>
      <span className="folder-client"><User size={12}/>{client}</span>
    </span>
    <span className="folder-meta-row">
      <span className="folder-status"><i/> {column.shortLabel}</span>
      {priorityLabel&&<span className={`folder-priority priority-${order.priority}`}>{order.priority==='urgent'?<Zap size={10}/>:<AlertTriangle size={10}/>} {priorityLabel}</span>}
    </span>
    <span className="folder-card-bottom">
      <span className={`folder-due${isOverdue?' overdue':''}`}><Clock size={11}/>{date(order.due_date)}</span>
      {order.total>0&&<span className="folder-total">{money(order.total)}</span>}
      <Avatar name={order.technician_name} size="tiny" id={`folder-avatar-${order.id}`}/>
    </span>
    <span className="folder-open-hint"><FileText size={11}/> Abrir detalhes <ChevronRight size={12}/></span>
  </article>;
}

export default function Orders(){
  const {session}=useSession();
  const [params,setParams]=useSearchParams();
  const [orders,setOrders]=useState<Order[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState('');
  const [view,setView]=useState('kanban');
  const [mine,setMine]=useState(false);
  const [openMenu,setOpenMenu]=useState<string|null>(null);
  const [busyAction,setBusyAction]=useState<string|null>(null);
  const navigate=useNavigate();
  const load=()=>api.get('/orders').then(r=>{setOrders(r.data);setLoaded(true);}).catch(e=>toast.error(errorText(e)));
  useEffect(()=>{load();},[]);
  useEffect(()=>{const close=()=>setOpenMenu(null);document.addEventListener('click',close);return()=>document.removeEventListener('click',close);},[]);
  const changeStatus=async(order:Order,nextStatus:string)=>{setBusyAction(order.id);try{await api.post(`/orders/${order.id}/status`,{status:nextStatus});toast.success(`OS #${order.number}: ${statuses[nextStatus]||'Status atualizado'}`);setOpenMenu(null);await load();}catch(e){toast.error(errorText(e));}finally{setBusyAction(null);}};
  const filtered=orders.filter(o=>(!status||kanbanColumns.find(c=>c.id===status)?.statuses.includes(o.status))&&(!mine||o.technician_id===session.user.id)&&`${o.number} ${o.client_name} ${o.item}`.toLowerCase().includes(search.toLowerCase()));

  return <>
    <PageHead title="Ordens de serviço" description="Cada projeto em seu lugar. Acompanhe o atendimento do primeiro contato à entrega.">
      <Btn testId="new-order-button" onClick={()=>setParams({new:'1'})}><Plus size={16}/>Nova ordem de serviço</Btn>
    </PageHead>
    <div className="status-tabs">{[{id:'',label:'Todas',statuses:[]},...kanbanColumns].map(col=><button data-testid={`order-filter-${col.id||'all'}`} key={col.id} className={status===col.id?'selected':''} onClick={()=>setStatus(col.id)}>{col.label}<span>{orders.filter(o=>!col.id||col.statuses.includes(o.status)).length}</span></button>)}</div>
    <div className="filters-bar">
      <SearchBox id="orders-search" value={search} onChange={setSearch} placeholder="Buscar por número, cliente ou item..."/>
      <Select id="orders-status-select" aria-label="Filtrar status" value={status} onChange={(e:any)=>setStatus(e.target.value)}><option value="">Todos os status</option>{kanbanColumns.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</Select>
      <Select id="orders-assignment-filter" aria-label="Responsável" value={mine?'mine':'all'} onChange={(e:any)=>setMine(e.target.value==='mine')}><option value="all">Todos os responsáveis</option><option value="mine">Minhas ordens</option></Select>
      <div className="view-switch" aria-label="Modo de exibição">
        <button data-testid="list-view-button" className={view==='list'?'selected':''} onClick={()=>setView('list')}><List size={16}/><span>Lista</span></button>
        <button data-testid="kanban-view-button" className={view==='kanban'?'selected':''} onClick={()=>setView('kanban')}><LayoutGrid size={15}/><span>Kanban</span></button>
      </div>
    </div>
    {!loaded?<Loading/>:view==='list'?<OrderTable orders={filtered}/>:<div className="kanban" data-testid="orders-kanban">{kanbanColumns.filter(c=>status?c.id===status:c.id!=='delivered'||filtered.some(o=>c.statuses.includes(o.status))).map(c=><section className="kanban-column folder-kanban-column" key={c.id} style={{'--col-color':c.color} as React.CSSProperties}><div className="kanban-title" data-testid={`kanban-column-${c.id}`}><span className="kanban-title-dot" style={{background:c.color}}/>{c.label}<span>{filtered.filter(o=>c.statuses.includes(o.status)).length}</span></div><div className="kanban-cards-scroll folder-kanban-scroll">{filtered.filter(o=>c.statuses.includes(o.status)).map(o=><FolderCard key={o.id} order={o} column={c} busy={busyAction===o.id} menuOpen={openMenu===o.id} onToggleMenu={()=>setOpenMenu(openMenu===o.id?null:o.id)} onAction={(next)=>changeStatus(o,next)} onOpen={()=>navigate(`/orders/${o.id}`)}/>)}</div></section>)}</div>}
    <OrderForm open={params.get('new')==='1'} onClose={()=>setParams({})}/>
  </>;
}
