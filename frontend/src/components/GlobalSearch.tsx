import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ClipboardList,
  User,
  Plus,
  LayoutDashboard,
  Users,
  Wallet,
  BarChart3,
  Settings,
  X,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Phone,
  Mail
} from 'lucide-react';
import { api, money, statuses } from '../lib/api';
import { useSession } from '../lib/session';
import { Badge, Avatar } from './Common';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ orders: any[]; clients: any[] }>({
    orders: [],
    clients: []
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setResults({ orders: [], clients: [] });
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ orders: [], clients: [] });
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.get('/search', { params: { q: query } });
        setResults(response.data || { orders: [], clients: [] });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectOrder = (orderId: string) => {
    onClose();
    navigate(`/orders/${orderId}`);
  };

  const handleSelectClient = (clientName: string) => {
    onClose();
    navigate('/clients');
  };

  const handleNavigation = (path: string) => {
    onClose();
    navigate(path);
  };

  if (!open) return null;

  const hasQuery = query.trim().length > 0;
  const hasResults = results.orders.length > 0 || results.clients.length > 0;

  return (
    <div
      className="global-search-backdrop"
      data-testid="global-search-modal"
      onClick={onClose}
    >
      <div
        className="global-search-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Search Header */}
        <div className="global-search-header">
          <Search size={18} className="global-search-icon" />
          <input
            ref={inputRef}
            data-testid="global-search-input"
            type="text"
            className="global-search-input"
            placeholder="Buscar ordens de serviço, clientes, equipamentos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
          />
          {loading && <Loader2 size={16} className="spin global-search-loader" />}
          {hasQuery && !loading && (
            <button
              type="button"
              className="global-search-clear"
              onClick={() => setQuery('')}
              title="Limpar busca"
            >
              <X size={15} />
            </button>
          )}
          <button
            type="button"
            className="global-search-close-btn"
            onClick={onClose}
            title="Fechar busca (ESC)"
          >
            ESC
          </button>
        </div>

        {/* Search Body */}
        <div className="global-search-body">
          {loading && !hasResults && (
            <div className="global-search-loading">
              <Loader2 size={24} className="spin text-violet-400" />
              <span>Buscando no workspace...</span>
            </div>
          )}

          {hasQuery && !loading && !hasResults && (
            <div className="global-search-empty" data-testid="global-search-empty">
              <div className="empty-icon-wrap">
                <Search size={24} />
              </div>
              <h4>Nenhum resultado encontrado</h4>
              <p>Não encontramos ordens ou clientes com o termo &ldquo;{query}&rdquo;.</p>
            </div>
          )}

          {hasQuery && results.orders.length > 0 && (
            <div className="global-search-section">
              <div className="global-search-section-title">
                <ClipboardList size={14} />
                <span>Ordens de Serviço ({results.orders.length})</span>
              </div>
              <div className="global-search-list">
                {results.orders.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="global-search-item"
                    data-testid={`search-order-${o.number}`}
                    onClick={() => handleSelectOrder(o.id)}
                  >
                    <div className="search-item-left">
                      <div className="search-item-badge-os">#{o.number}</div>
                      <div className="search-item-details">
                        <div className="search-item-primary">
                          <strong>{o.item || 'Equipamento'}</strong>
                          <span className="search-item-dot">•</span>
                          <span className="search-item-client">{o.client_name}</span>
                        </div>
                        {o.problem && (
                          <div className="search-item-subtitle">{o.problem}</div>
                        )}
                      </div>
                    </div>
                    <div className="search-item-right">
                      <Badge status={o.status} id={`search-${o.id}`} />
                      {o.total > 0 && (
                        <span className="search-item-price">{money(o.total)}</span>
                      )}
                      <ArrowRight size={14} className="search-item-arrow" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasQuery && results.clients.length > 0 && (
            <div className="global-search-section">
              <div className="global-search-section-title">
                <Users size={14} />
                <span>Clientes ({results.clients.length})</span>
              </div>
              <div className="global-search-list">
                {results.clients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="global-search-item"
                    data-testid={`search-client-${c.id}`}
                    onClick={() => handleSelectClient(c.name)}
                  >
                    <div className="search-item-left">
                      <Avatar name={c.name} size="tiny" />
                      <div className="search-item-details">
                        <div className="search-item-primary">
                          <strong>{c.name}</strong>
                          {c.document && (
                            <span className="search-item-doc">({c.document})</span>
                          )}
                        </div>
                        <div className="search-item-contacts">
                          {c.phone && (
                            <span>
                              <Phone size={11} /> {c.phone}
                            </span>
                          )}
                          {c.email && (
                            <span>
                              <Mail size={11} /> {c.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="search-item-right">
                      <span className="search-action-hint">Ver clientes</span>
                      <ArrowRight size={14} className="search-item-arrow" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!hasQuery && (
            <>
              {/* Quick Actions */}
              <div className="global-search-section">
                <div className="global-search-section-title">AÇÕES RÁPIDAS</div>
                <div className="global-search-list">
                  <button
                    type="button"
                    className="global-search-item action-item"
                    onClick={() => {
                      onClose();
                      navigate('/orders?new=1');
                    }}
                  >
                    <div className="search-item-left">
                      <div className="search-action-icon">
                        <Plus size={15} />
                      </div>
                      <div className="search-item-details">
                        <strong>Nova ordem de serviço</strong>
                        <span>Abrir chamado para cliente</span>
                      </div>
                    </div>
                    <kbd className="search-shortcut">N</kbd>
                  </button>

                  <button
                    type="button"
                    className="global-search-item action-item"
                    onClick={() => {
                      onClose();
                      navigate('/clients');
                    }}
                  >
                    <div className="search-item-left">
                      <div className="search-action-icon client-icon">
                        <User size={15} />
                      </div>
                      <div className="search-item-details">
                        <strong>Cadastrar cliente</strong>
                        <span>Adicionar contato ou empresa</span>
                      </div>
                    </div>
                    <kbd className="search-shortcut">C</kbd>
                  </button>
                </div>
              </div>

              {/* Quick Navigation */}
              <div className="global-search-section">
                <div className="global-search-section-title">NAVEGAÇÃO</div>
                <div className="global-search-grid">
                  {isAdmin && (
                    <button
                      type="button"
                      className="search-nav-card"
                      onClick={() => handleNavigation('/')}
                    >
                      <LayoutDashboard size={16} />
                      <span>Visão geral</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="search-nav-card"
                    onClick={() => handleNavigation('/orders')}
                  >
                    <ClipboardList size={16} />
                    <span>Ordens de serviço</span>
                  </button>
                  <button
                    type="button"
                    className="search-nav-card"
                    onClick={() => handleNavigation('/clients')}
                  >
                    <Users size={16} />
                    <span>Clientes</span>
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        className="search-nav-card"
                        onClick={() => handleNavigation('/finance')}
                      >
                        <Wallet size={16} />
                        <span>Financeiro</span>
                      </button>
                      <button
                        type="button"
                        className="search-nav-card"
                        onClick={() => handleNavigation('/reports')}
                      >
                        <BarChart3 size={16} />
                        <span>Relatórios</span>
                      </button>
                      <button
                        type="button"
                        className="search-nav-card"
                        onClick={() => handleNavigation('/team')}
                      >
                        <Users size={16} />
                        <span>Equipe</span>
                      </button>
                      <button
                        type="button"
                        className="search-nav-card"
                        onClick={() => handleNavigation('/settings')}
                      >
                        <Settings size={16} />
                        <span>Configurações</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="global-search-footer">
          <div className="footer-shortcuts">
            <span>
              <kbd>ESC</kbd> fechar
            </span>
            <span>
              <kbd>↵</kbd> selecionar
            </span>
            <span>
              <kbd>Ctrl</kbd> + <kbd>K</kbd> atalho
            </span>
          </div>
          <div className="footer-security">
            <ShieldCheck size={13} />
            <span>Multi-tenant · {session?.company?.name || 'Workspace seguro'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
