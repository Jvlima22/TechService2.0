import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Laptop,
  Car,
  Wrench,
  Sparkles,
  ArrowRight,
  Check,
  ShieldCheck,
  ClipboardCheck,
  Smartphone,
  MessageSquare,
  TrendingUp,
  Users,
  BarChart3,
  Mail,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { api, errorText } from '../lib/api';
import { useSession } from '../lib/session';
import { Field, Btn } from '../components/Common';
import './Auth.css';

const niches = [
  ['assistance', 'Assistência técnica', Laptop],
  ['automotive', 'Oficina automotiva', Car],
  ['maintenance', 'Manutenção', Wrench],
  ['beauty', 'Estética e bem-estar', Sparkles],
] as const;

export const Brand = () => {
  return (
    <Link to="/" className="brand auth-brand" data-testid="auth-brand">
      <img className="brand-logo" src="/branding/tech-service-dark.png" alt="Tech Service" />
      <div className="brand-text">
        <div className="brand-title">
          <strong className="brand-tech">tech</strong>
          <span className="brand-service">service</span>
        </div>
        <small>WORKSPACE</small>
      </div>
    </Link>
  );
};

function ForgotView({ onBack }: { onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { email } = Object.fromEntries(new FormData(e.currentTarget)) as any;
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-form-card" data-testid="forgot-sent-card">
        <div className="auth-form-header">
          <Brand />
          <h1>Verifique seu e-mail</h1>
          <p>Se o endereço informado estiver cadastrado, você receberá um link de redefinição em instantes.</p>
        </div>
        <div className="forgot-sent-box">
          <CheckCircle2 size={40} className="forgot-sent-icon" />
          <p>O link expira em <strong>1 hora</strong>. Verifique também sua caixa de spam.</p>
        </div>
        <button className="forgot-back-btn" onClick={onBack} data-testid="back-to-login">
          <ArrowLeft size={14} /> Voltar para o login
        </button>
      </div>
    );
  }

  return (
    <div className="auth-form-card" data-testid="forgot-card">
      <div className="auth-form-header">
        <Brand />
        <h1>Recuperar senha</h1>
        <p>Digite o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
      </div>
      <form onSubmit={submit}>
        <Field label="E-mail da conta" id="forgot-email" name="email" type="email" required placeholder="voce@empresa.com.br" />
        {error && <div className="error-alert" data-testid="forgot-error">{error}</div>}
        <Btn testId="forgot-submit" type="submit" disabled={busy}>
          {busy ? 'Enviando...' : 'Enviar link de recuperação'}
          <Mail size={15} />
        </Btn>
      </form>
      <div className="auth-footer-links">
        <button className="forgot-back-btn" onClick={onBack} data-testid="back-to-login-2">
          <ArrowLeft size={14} /> Voltar para o login
        </button>
      </div>
    </div>
  );
}

function ResetView({ token }: { token: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { password, confirm } = Object.fromEntries(new FormData(e.currentTarget)) as any;
    if (password !== confirm) { setError('As senhas não coincidem'); return; }
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/auth/login'), 3000);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="auth-form-card" data-testid="reset-done-card">
        <div className="auth-form-header">
          <Brand />
          <h1>Senha redefinida!</h1>
          <p>Sua senha foi atualizada com sucesso. Redirecionando para o login...</p>
        </div>
        <div className="forgot-sent-box">
          <CheckCircle2 size={40} className="forgot-sent-icon" />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form-card" data-testid="reset-card">
      <div className="auth-form-header">
        <Brand />
        <h1>Nova senha</h1>
        <p>Escolha uma senha forte com pelo menos 8 caracteres.</p>
      </div>
      <form onSubmit={submit}>
        <Field label="Nova senha" id="reset-password" name="password" type="password" minLength={8} maxLength={64} required placeholder="Pelo menos 8 caracteres" autoComplete="new-password" />
        <Field label="Confirmar nova senha" id="reset-confirm" name="confirm" type="password" minLength={8} maxLength={64} required placeholder="Repita a senha" autoComplete="new-password" />
        {error && <div className="error-alert" data-testid="reset-error">{error}</div>}
        <Btn testId="reset-submit" type="submit" disabled={busy}>
          {busy ? 'Salvando...' : 'Salvar nova senha'}
          <KeyRound size={15} />
        </Btn>
      </form>
      <div className="auth-footer-links">
        <Link to="/auth/login" className="forgot-back-btn">
          <ArrowLeft size={14} /> Voltar para o login
        </Link>
      </div>
    </div>
  );
}

function Showcase() {
  return (
    <aside className="auth-showcase">
      <div className="showcase-header">
        <div className="showcase-badge">
          <span className="showcase-badge-dot" />
          Ecossistema de Gestão Especializada
        </div>
        <h2 className="showcase-title">
          Tudo o que seu negócio precisa em um <span>único workspace</span>.
        </h2>
        <p className="showcase-description">
          O TechService integra atendimento, execução técnica, finanças e comunicação
          com clientes em uma plataforma rápida, intuitiva e pensada para o dia a dia.
        </p>
        <div className="showcase-features-grid">
          <div className="showcase-feat-item">
            <div className="showcase-feat-icon"><ClipboardCheck size={18} /></div>
            <div className="showcase-feat-text"><strong>Ordens de Serviço 360°</strong><p>Checklist de entrada, laudos técnicos, fotos, histórico e prazos de entrega.</p></div>
          </div>
          <div className="showcase-feat-item">
            <div className="showcase-feat-icon"><Smartphone size={18} /></div>
            <div className="showcase-feat-text"><strong>Aprovacao Online do Cliente</strong><p>Link exclusivo para o cliente aprovar orcamentos pelo celular sem burocracia.</p></div>
          </div>
          <div className="showcase-feat-item">
            <div className="showcase-feat-icon"><MessageSquare size={18} /></div>
            <div className="showcase-feat-text"><strong>Notificações Automáticas</strong><p>Avisos instantâneos via WhatsApp, SMS e E-mail a cada etapa do serviço.</p></div>
          </div>
          <div className="showcase-feat-item">
            <div className="showcase-feat-icon"><TrendingUp size={18} /></div>
            <div className="showcase-feat-text"><strong>Financeiro Integrado</strong><p>Controle de recebimentos, fluxo de caixa, pagamentos online e faturamento.</p></div>
          </div>
          <div className="showcase-feat-item">
            <div className="showcase-feat-icon"><Users size={18} /></div>
            <div className="showcase-feat-text"><strong>Gestão de Equipe & Técnicos</strong><p>Distribuição de ordens, produtividade individual e trilha completa de auditoria.</p></div>
          </div>
          <div className="showcase-feat-item">
            <div className="showcase-feat-icon"><BarChart3 size={18} /></div>
            <div className="showcase-feat-text"><strong>Métricas & Relatórios</strong><p>Dashboards dinâmicos com taxa de conversão, tempo médio e ticket médio.</p></div>
          </div>
        </div>
        <div className="showcase-niches-box">
          <div className="niches-header">Personalizado para o seu segmento</div>
          <div className="niches-pills">
            <span className="niche-tag"><Laptop size={13} /> Assistência Técnica & Eletrônicos</span>
            <span className="niche-tag"><Car size={13} /> Oficinas Mecânicas & Autocentros</span>
            <span className="niche-tag"><Wrench size={13} /> Manutenção Predial & Equipamentos</span>
            <span className="niche-tag"><Sparkles size={13} /> Estética & Bem-Estar</span>
          </div>
        </div>
        <div className="showcase-highlights">
          <div className="highlight-item"><strong>100% em Nuvem</strong><span>Acesse de onde estiver</span></div>
          <div className="highlight-item"><strong>Multi-Empresa</strong><span>Dados isolados e seguros</span></div>
          <div className="highlight-item"><strong>Trilha de Auditoria</strong><span>Histórico de cada alteração</span></div>
          <div className="highlight-item"><strong>Backups Contínuos</strong><span>Segurança garantida</span></div>
        </div>
      </div>
      <div className="showcase-footer">
        <div className="showcase-footer-left">
          <ShieldCheck size={16} />
          <span>Dados criptografados e proteção de privacidade enterprise</span>
        </div>
        <span>99.9% Uptime garantido</span>
      </div>
    </aside>
  );
}

export default function Auth() {
  const { mode, token } = useParams();
  const registering = mode === 'register';
  const isReset = !!token;

  const [niche, setNiche] = useState('assistance');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const { save } = useSession();
  const navigate = useNavigate();

  useEffect(() => { setError(''); setForgotMode(false); }, [mode]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    try {
      const r = await api.post(
        registering ? '/auth/register' : '/auth/login',
        registering ? { ...body, niche } : body
      );
      save(r.data);
      navigate(r.data.user.role === 'admin' ? '/' : '/orders');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (isReset) {
    return (
      <div className="auth-split-layout">
        <main className="auth-form-side"><ResetView token={token!} /></main>
        <Showcase />
      </div>
    );
  }

  if (forgotMode) {
    return (
      <div className="auth-split-layout">
        <main className="auth-form-side"><ForgotView onBack={() => setForgotMode(false)} /></main>
        <Showcase />
      </div>
    );
  }

  return (
    <div className="auth-split-layout">
      <main className="auth-form-side">
        <div className={`auth-form-card ${registering ? 'register-mode' : ''}`}>
          <div className="auth-form-header">
            <Brand />
            <h1 data-testid="auth-title">
              {registering ? 'Crie o espaço da sua empresa' : 'Bom ter você de volta.'}
            </h1>
            <p className="auth-subtitle" data-testid="auth-subtitle">
              {registering
                ? 'Comece agora a gerenciar seus serviços com excelência.'
                : 'Acesse seu workspace com seu e-mail e senha.'}
            </p>
          </div>

          <form onSubmit={submit} key={mode}>
            {registering && (
              <>
                <div className="niche-grid">
                  {niches.map(([id, label, Icon]) => (
                    <button type="button" key={id} className={`niche-option ${niche === id ? 'selected' : ''}`} data-testid={`niche-${id}`} onClick={() => setNiche(id)}>
                      <Icon size={20} />
                      <span>{label}</span>
                      {niche === id && <Check size={13} style={{ marginLeft: 'auto' }} />}
                    </button>
                  ))}
                </div>
                <div className="form-grid">
                  <Field label="Seu nome" id="auth-name" name="name" required minLength={2} placeholder="Nome completo" />
                  <Field label="Nome da empresa" id="auth-company" name="company_name" required minLength={2} placeholder="Sua empresa" />
                </div>
              </>
            )}

            <Field label="E-mail" id="auth-email" name="email" type="email" required placeholder="voce@empresa.com.br" />

            <div className="password-field-wrapper">
              <Field
                label="Senha"
                id="auth-password"
                name="password"
                type="password"
                minLength={registering ? 8 : 1}
                maxLength={64}
                required
                placeholder={registering ? 'Pelo menos 8 caracteres' : 'Sua senha'}
                autoComplete={registering ? 'new-password' : 'current-password'}
              />
              {!registering && (
                <button type="button" className="forgot-password-link" onClick={() => setForgotMode(true)} data-testid="forgot-password-btn">
                  Esqueceu sua senha?
                </button>
              )}
            </div>

            {error && <div className="error-alert" data-testid="auth-error">{error}</div>}

            <Btn testId="auth-submit" type="submit" disabled={busy}>
              {busy ? 'Aguarde...' : registering ? 'Criar minha empresa' : 'Entrar na minha conta'}
              <ArrowRight size={15} />
            </Btn>
          </form>

          <div className="auth-footer-links">
            <div data-testid="auth-alternative">
              {registering ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}
              <Link data-testid="auth-toggle" to={registering ? '/auth/login' : '/auth/register'} style={{ marginLeft: 6 }}>
                {registering ? 'Entrar' : 'Criar minha empresa'}
              </Link>
            </div>
            <div>
              <Link data-testid="back-to-workspace" to="/" className="back-to-workspace-link">
                Voltar ao workspace
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Showcase />
    </div>
  );
}
