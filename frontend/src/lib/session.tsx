import React, {createContext,useContext,useEffect,useState} from 'react';
import {api,Session} from './api';
const Context = createContext<any>(null);
let demoRequest: Promise<any> | null = null;
export const SessionProvider = ({children}:{children:React.ReactNode}) => {
 const [session,setSession]=useState<Session|null>(null), [loading,setLoading]=useState(true), [failed,setFailed]=useState(false);
 const save=(s:Session)=>{localStorage.setItem('tech-service-token',s.token);setSession(s);setLoading(false);};
 useEffect(()=>{(async()=>{try{if(localStorage.getItem('tech-service-token')) save((await api.get('/auth/me')).data);else if(!window.location.pathname.startsWith('/auth')&&!window.location.pathname.startsWith('/p/')){if(!demoRequest) demoRequest=api.post('/auth/demo');save((await demoRequest).data);}}catch(e){localStorage.removeItem('tech-service-token');setFailed(true);}finally{setLoading(false);}})();},[]);
 const refresh=async()=>save((await api.get('/auth/me')).data);
 return <Context.Provider value={{session,save,refresh,loading,failed,logout:()=>{localStorage.removeItem('tech-service-token');setSession(null);window.location.href='/auth/login';}}}>{children}</Context.Provider>;
};
export const useSession=()=>useContext(Context);