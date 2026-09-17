import React from 'react';
import {BrowserRouter,Routes,Route,Navigate,Outlet} from 'react-router-dom';
import {Toaster} from './components/ui/sonner';
import {SessionProvider,useSession} from './lib/session';
import {Loading,Btn} from './components/Common';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Clients from './pages/Clients';
import Finance from './pages/Finance';
import Reports from './pages/Reports';
import Team from './pages/Team';
import Settings from './pages/Settings';
import Activity from './pages/Activity';
import Plans from './pages/Plans';
import Auth from './pages/Auth';
import PublicOrder from './pages/PublicOrder';
import './App.css';

function Private(){const {session,loading}=useSession();if(loading)return <Loading/>;return session?<Layout/>:<Navigate to="/auth/login" replace/>;}
function Admin(){const {session}=useSession();return session?.user.role==='admin'?<Outlet/>:<Navigate to="/orders" replace/>;}
function Overview(){const {session}=useSession();return session?.user.role==='admin'?<Dashboard/>:<Navigate to="/orders" replace/>;}
class ErrorBoundary extends React.Component{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="empty" data-testid="application-error"><h1>Não foi possível abrir esta tela.</h1><Btn testId="reload-app" onClick={()=>window.location.reload()}>Tentar novamente</Btn></div>:this.props.children;}}
function AppContent(){
  return (
    <Routes>
      <Route path="/auth/:mode" element={<Auth/>}/>
      <Route path="/auth/reset/:token" element={<Auth/>}/>
      <Route path="/p/:token" element={<PublicOrder/>}/>
      <Route element={<Private/>}>
        <Route index element={<Overview/>}/>
        <Route path="orders" element={<Orders/>}/>
        <Route path="orders/:id" element={<OrderDetail/>}/>
        <Route path="clients" element={<Clients/>}/>
        <Route element={<Admin/>}>
          <Route path="finance" element={<Finance/>}/>
          <Route path="reports" element={<Reports/>}/>
          <Route path="team" element={<Team/>}/>
          <Route path="settings" element={<Settings/>}/>
          <Route path="plans" element={<Plans/>}/>
          <Route path="activity" element={<Activity/>}/>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}
export default function App(){
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SessionProvider>
          <AppContent/>
          <Toaster richColors position="bottom-right"/>
        </SessionProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}