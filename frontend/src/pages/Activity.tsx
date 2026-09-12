import React,{useState,useEffect} from 'react';
import {Link} from 'react-router-dom';
import {History,ArrowUpRight} from 'lucide-react';
import {api,date,errorText} from '../lib/api';
import {PageHead,SearchBox,Empty,Loading} from '../components/Common';
import {toast} from 'sonner';
export default function Activity(){
 const [items,setItems]=useState<any[]>([]),[search,setSearch]=useState(''),[loaded,setLoaded]=useState(false);useEffect(()=>{api.get('/audit').then(r=>{setItems(r.data);setLoaded(true);}).catch(e=>toast.error(errorText(e)));},[]);
 const filtered=items.filter(a=>`${a.actor} ${a.description}`.toLowerCase().includes(search.toLowerCase()));
 return <><PageHead title="Histórico de atividades" description="Cada alteração, com nome, data e contexto."/><div className="filters-bar"><SearchBox value={search} onChange={setSearch} id="activity-search" placeholder="Buscar por pessoa ou atividade..."/></div>{!loaded?<Loading/>:!filtered.length?<Empty text="Nenhuma atividade encontrada."/>:<section className="detail-section"><div className="timeline">{filtered.map(h=><div className="timeline-entry" key={h.id} data-testid={`audit-${h.id}`}><strong>{h.description}</strong><span>{h.actor} · {date(h.created_at,true)}</span>{h.order_id&&<Link to={`/orders/${h.order_id}`} className="text-link" style={{marginTop:8}} data-testid={`audit-order-${h.id}`}>Abrir ordem<ArrowUpRight size={12}/></Link>}</div>)}</div></section>}</>
}