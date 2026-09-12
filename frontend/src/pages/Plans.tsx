import React, { useState } from 'react';
import { 
  Check, 
  Zap, 
  Crown, 
  ShieldCheck, 
  Sparkles, 
  Building2, 
  HelpCircle, 
  ArrowRight, 
  CreditCard, 
  Users, 
  FileText, 
  MessageCircle, 
  Sliders, 
  BarChart3, 
  Headphones, 
  CheckCircle2,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import { PageHead, Btn, Modal } from '../components/Common';
import { useSession } from '../lib/session';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  badge?: string;
  tagline: string;
  priceMonthly: number;
  priceAnnual: number;
  popular?: boolean;
  icon: any;
  usersLimit: string;
  features: string[];
  ctaText: string;
  highlightColor: string;
  caktoUrlMonthly: string;
  caktoUrlAnnual: string;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Ideal para técnicos autônomos e assistências no início.',
    priceMonthly: 79,
    priceAnnual: 63,
    icon: Zap,
    usersLimit: 'Até 2 usuários',
    highlightColor: '#638aff',
    caktoUrlMonthly: 'https://pay.cakto.com.br/byvqwzf_1104578',
    caktoUrlAnnual: 'https://pay.cakto.com.br/bed9jz4',
    features: [
      'Ordens de serviço ilimitadas',
      'Até 2 usuários/técnicos',
      'Gestão básica de clientes',
      'Até 3 campos personalizados',
      'Acompanhamento do cliente via link público',
      'Relatórios básicos de desempenho',
      'Suporte via E-mail (24h)'
    ],
    ctaText: 'Escolher Starter'
  },
  {
    id: 'pro',
    name: 'Pro',
    badge: 'Mais Popular',
    popular: true,
    tagline: 'Perfeito para assistências em expansão que querem automação.',
    priceMonthly: 149,
    priceAnnual: 119,
    icon: Sparkles,
    usersLimit: 'Até 5 usuários',
    highlightColor: '#8170f4',
    caktoUrlMonthly: 'https://pay.cakto.com.br/d97ai8v_1104582',
    caktoUrlAnnual: 'https://pay.cakto.com.br/poqag6s',
    features: [
      'Tudo do plano Starter',
      'Até 5 usuários/técnicos',
      'Campos personalizados ilimitados',
      'Módulo financeiro completo & receitas',
      'Notificações de OS via WhatsApp e E-mail',
      'Logotipo personalizado no portal do cliente',
      'Relatórios avançados com exportação em PDF/Excel',
      'Suporte prioritário via WhatsApp'
    ],
    ctaText: 'Assinar Plano Pro'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'Corporativo',
    tagline: 'Para grandes redes de assistência com demandas exclusivas.',
    priceMonthly: 299,
    priceAnnual: 239,
    icon: Crown,
    usersLimit: 'Usuários ilimitados',
    highlightColor: '#edb55c',
    caktoUrlMonthly: 'https://pay.cakto.com.br/34mt2ad_1104585',
    caktoUrlAnnual: 'https://pay.cakto.com.br/bf7oo52',
    features: [
      'Tudo do plano Pro',
      'Usuários e técnicos ilimitados',
      'Marca branca completa (White-label)',
      'Notificações customizadas ilimitadas',
      'Acesso à API de integração dedicada',
      'Exportação bruta de banco de dados',
      'SLA de atendimento garantido em 2h',
      'Gerente de conta exclusivo'
    ],
    ctaText: 'Contatar Vendas'
  }
];

const FAQS = [
  {
    q: 'Como funciona o pagamento via Cakto?',
    a: 'Você será redirecionado para a página segura de pagamento da Cakto. Aceitamos PIX com liberação imediata ou Cartão de Crédito em até 12x.'
  },
  {
    q: 'A ativação do plano é automática?',
    a: 'Sim! Assim que o pagamento for aprovado pela Cakto, o Webhook do sistema atualizará seu plano e liberará os novos recursos em segundos.'
  },
  {
    q: 'Posso alterar meu plano a qualquer momento?',
    a: 'Sim! Você pode fazer upgrade ou downgrade de plano a qualquer instante através da Cakto.'
  },
  {
    q: 'Como funciona o desconto no plano anual?',
    a: 'No pagamento anual, você recebe 20% de desconto sobre o valor total mensal, equivalente a quase 3 meses de uso gratuito.'
  }
];

export default function Plans() {
  const { session } = useSession();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Active plan for current session
  const activePlanId = session.company.demo ? 'starter' : 'pro';

  const handleSubscribe = (plan: Plan) => {
    setSelectedPlan(plan);
  };

  const redirectToCakto = () => {
    if (!selectedPlan) return;
    setSubmitting(true);

    const baseUrl = billingCycle === 'annual' ? selectedPlan.caktoUrlAnnual : selectedPlan.caktoUrlMonthly;

    // Build Cakto Checkout URL with company parameters
    const params = new URLSearchParams({
      custom_id: session.company.id,
      company_code: session.company.code,
      email: session.user.email,
      name: session.user.name,
      cycle: billingCycle
    });

    const checkoutUrl = `${baseUrl}?${params.toString()}`;

    setTimeout(() => {
      setSubmitting(false);
      setSelectedPlan(null);
      window.open(checkoutUrl, '_blank');
      toast.info('Redirecionando para a página de checkout seguro da Cakto...', {
        description: 'Assim que o pagamento for confirmado, seu plano será liberado automaticamente.'
      });
    }, 500);
  };

  return (
    <>
      <PageHead
        title="Planos e Assinatura"
        description="Escolha o plano ideal para alavancar a gestão da sua assistência técnica."
      />

      <div className="plans-wrapper">
        {/* Active plan status banner */}
        <div className="current-plan-banner" data-testid="active-plan-banner">
          <div className="cp-left">
            <ShieldCheck size={24} className="cp-icon" />
            <div>
              <span className="cp-label">Plano Atual da Empresa</span>
              <strong className="cp-name">
                {activePlanId === 'starter' ? 'Starter (Demonstração)' : 'Pro (Profissional)'}
              </strong>
            </div>
          </div>
          <div className="cp-right">
            <span className="cp-status">● Assinatura Ativa (Cakto)</span>
            <span className="cp-date">Renovação automática via Cakto Pay</span>
          </div>
        </div>

        {/* Billing cycle toggle */}
        <div className="billing-toggle-container">
          <div className="billing-toggle">
            <button
              type="button"
              className={`bt-btn${billingCycle === 'monthly' ? ' active' : ''}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Cobrança Mensal
            </button>
            <button
              type="button"
              className={`bt-btn${billingCycle === 'annual' ? ' active' : ''}`}
              onClick={() => setBillingCycle('annual')}
            >
              Cobrança Anual
              <span className="discount-pill">Economize 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="plans-grid">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
            const isCurrent = activePlanId === plan.id;

            return (
              <div
                key={plan.id}
                className={`plan-card${plan.popular ? ' popular' : ''}${isCurrent ? ' current' : ''}`}
                style={{ '--plan-color': plan.highlightColor } as React.CSSProperties}
                data-testid={`plan-card-${plan.id}`}
              >
                {plan.badge && <span className="plan-badge">{plan.badge}</span>}
                {isCurrent && <span className="plan-current-badge">Seu Plano</span>}

                <div className="plan-header">
                  <div className="plan-icon-wrap" style={{ background: `${plan.highlightColor}18`, color: plan.highlightColor }}>
                    <Icon size={24} />
                  </div>
                  <h3>{plan.name}</h3>
                  <p>{plan.tagline}</p>
                </div>

                <div className="plan-pricing">
                  <div className="price-amount">
                    <small>R$</small>
                    <strong>{price}</strong>
                    <span>/mês</span>
                  </div>
                  <span className="billing-note">
                    {billingCycle === 'annual' ? `Faturado R$ ${price * 12}/ano na Cakto` : 'Faturado mensalmente na Cakto'}
                  </span>
                </div>

                <div className="plan-limit-pill">
                  <Users size={14} />
                  <span>{plan.usersLimit}</span>
                </div>

                <Btn
                  className={`plan-cta-btn${plan.popular ? ' primary' : ' secondary'}`}
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrent}
                  testId={`select-plan-${plan.id}`}
                >
                  {isCurrent ? 'Plano Ativo' : plan.ctaText}
                  {!isCurrent && <ArrowRight size={15} />}
                </Btn>

                <div className="plan-features">
                  <span className="features-title">Recursos incluídos:</span>
                  <ul>
                    {plan.features.map((feat, idx) => (
                      <li key={idx}>
                        <CheckCircle2 size={16} className="feat-check" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Matrix */}
        <div className="matrix-section">
          <h2 className="matrix-title">Comparativo detalhado de recursos</h2>
          <p className="matrix-subtitle">Confira o que está incluído em cada nível do TechService</p>

          <div className="matrix-table-wrap">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>Recurso</th>
                  <th className="tc">Starter</th>
                  <th className="tc highlight">Pro</th>
                  <th className="tc">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="feat-item-info">
                      <Users size={16} />
                      <div><strong>Limite de Usuários</strong><span>Usuários com acesso ao sistema</span></div>
                    </div>
                  </td>
                  <td className="tc">Até 2</td>
                  <td className="tc highlight">Até 5</td>
                  <td className="tc">Ilimitado</td>
                </tr>
                <tr>
                  <td>
                    <div className="feat-item-info">
                      <FileText size={16} />
                      <div><strong>Ordens de Serviço</strong><span>Gestão e cadastro de OS</span></div>
                    </div>
                  </td>
                  <td className="tc"><Check size={18} className="text-green" /></td>
                  <td className="tc highlight"><Check size={18} className="text-green" /></td>
                  <td className="tc"><Check size={18} className="text-green" /></td>
                </tr>
                <tr>
                  <td>
                    <div className="feat-item-info">
                      <Sliders size={16} />
                      <div><strong>Campos Personalizados</strong><span>Atributos extras para aparelhos</span></div>
                    </div>
                  </td>
                  <td className="tc">Até 3 campos</td>
                  <td className="tc highlight">Ilimitado</td>
                  <td className="tc">Ilimitado</td>
                </tr>
                <tr>
                  <td>
                    <div className="feat-item-info">
                      <MessageCircle size={16} />
                      <div><strong>Notificações WhatsApp & E-mail</strong><span>Envio automático de status</span></div>
                    </div>
                  </td>
                  <td className="tc">Apenas E-mail</td>
                  <td className="tc highlight"><Check size={18} className="text-green" /></td>
                  <td className="tc"><Check size={18} className="text-green" /></td>
                </tr>
                <tr>
                  <td>
                    <div className="feat-item-info">
                      <BarChart3 size={16} />
                      <div><strong>Módulo Financeiro & Fluxo de Caixa</strong><span>Gestão de caixa e faturamento</span></div>
                    </div>
                  </td>
                  <td className="tc">Básico</td>
                  <td className="tc highlight"><Check size={18} className="text-green" /></td>
                  <td className="tc"><Check size={18} className="text-green" /></td>
                </tr>
                <tr>
                  <td>
                    <div className="feat-item-info">
                      <Crown size={16} />
                      <div><strong>Marca Branca & API Dedicada</strong><span>Remoção da marca TechService</span></div>
                    </div>
                  </td>
                  <td className="tc">—</td>
                  <td className="tc highlight">—</td>
                  <td className="tc"><Check size={18} className="text-green" /></td>
                </tr>
                <tr>
                  <td>
                    <div className="feat-item-info">
                      <Headphones size={16} />
                      <div><strong>Canal de Suporte</strong><span>Tempo de resposta e canal</span></div>
                    </div>
                  </td>
                  <td className="tc">E-mail (24h)</td>
                  <td className="tc highlight">WhatsApp Prioritário</td>
                  <td className="tc">Gerente de Conta + SLA</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="faq-section">
          <h2 className="faq-title">
            <HelpCircle size={22} /> Perguntas Frequentes
          </h2>
          <div className="faq-grid">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`faq-card${openFaqIndex === i ? ' open' : ''}`}
                onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
              >
                <div className="faq-question">
                  <h4>{faq.q}</h4>
                  <ChevronDown size={18} className="faq-arrow" />
                </div>
                {openFaqIndex === i && <p className="faq-answer">{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subscription Modal for Cakto Checkout */}
      <Modal
        open={Boolean(selectedPlan)}
        onClose={() => setSelectedPlan(null)}
        title={`Assinar Plano ${selectedPlan?.name} via Cakto`}
        id="subscribe-modal"
      >
        {selectedPlan && (
          <div className="sub-modal-content">
            <div className="sub-modal-summary">
              <div className="sms-icon" style={{ background: `${selectedPlan.highlightColor}20`, color: selectedPlan.highlightColor }}>
                <selectedPlan.icon size={26} />
              </div>
              <div>
                <h3>Plano {selectedPlan.name}</h3>
                <p>{selectedPlan.usersLimit} · Faturamento {billingCycle === 'annual' ? 'Anual' : 'Mensal'}</p>
              </div>
              <div className="sms-price">
                <strong>R$ {billingCycle === 'annual' ? selectedPlan.priceAnnual : selectedPlan.priceMonthly}</strong>
                <span>/mês</span>
              </div>
            </div>

            <div className="info-alert">
              <ShieldCheck size={18} />
              <span>
                Você será direcionado para o checkout seguro da <strong>Cakto Pay</strong> ({billingCycle === 'annual' ? 'Anual' : 'Mensal'}). Aceitamos PIX e Cartão de Crédito. A liberação no TechService ocorrerá de forma instantânea via Webhook.
              </span>
            </div>

            <div className="form-actions" style={{ marginTop: 20 }}>
              <Btn secondary onClick={() => setSelectedPlan(null)}>
                Cancelar
              </Btn>
              <Btn
                onClick={redirectToCakto}
                disabled={submitting}
                testId="confirm-subscribe-btn"
              >
                <CreditCard size={15} />
                {submitting ? 'Aguarde...' : 'Ir para Checkout Cakto'}
                <ExternalLink size={14} style={{ marginLeft: 4 }} />
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
