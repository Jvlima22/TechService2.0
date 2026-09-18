import axios from 'axios';

const configuredBackendUrl = process.env.REACT_APP_BACKEND_URL || '';
const backendUrl = process.env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1/i.test(configuredBackendUrl)
  ? 'https://techservice-tgl.vercel.app'
  : configuredBackendUrl;
export const api = axios.create({ baseURL: `${backendUrl}/api` });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('tech-service-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const money = (n: number = 0) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
export const date = (d: string, time=false) => d ? new Date(d.length===10 ? `${d}T12:00:00` : d).toLocaleDateString('pt-BR',time ? {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'} : {day:'2-digit',month:'short'}) : '—';
export const initials = (s: string='') => s.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
export const errorText = (e:any) => {const d=e.response?.data?.detail;return typeof d==='string'?d:'Não foi possível concluir. Verifique os campos e tente novamente.';};
export const statuses: Record<string,string> = {open:'Aberta',diagnosis:'Em diagnóstico',awaiting:'Aguardando aprovação',awaiting_payment:'Aguardando pagamento',approved:'Aprovada',rejected:'Recusada',paid:'Paga',in_progress:'Em execução',completed:'Pronto',delivered:'Entregue',cancelled:'Cancelada'};
export const transitions: Record<string,string[]> = {open:['diagnosis','cancelled'],diagnosis:['awaiting','cancelled'],awaiting:['diagnosis','awaiting_payment','cancelled'],awaiting_payment:['paid','cancelled'],approved:['in_progress','cancelled'],rejected:['diagnosis','cancelled'],paid:['in_progress','cancelled'],in_progress:['completed','cancelled'],completed:['delivered','cancelled'],delivered:[],cancelled:[]};
export type Session = {token:string;user:any;company:any;template:any};
export type Order = {id:string;number:number;client_id:string;client_name:string;item:string;problem:string;status:string;priority:string;total:number;paid?:number;technician_id:string;technician_name:string;created_at:string;due_date:string;[key:string]:any};
