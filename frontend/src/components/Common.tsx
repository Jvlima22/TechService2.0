import React from 'react';
import {Loader2, Plus, Search, ArrowUpRight, Inbox} from 'lucide-react';
import {Button} from './ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription} from './ui/dialog';
import {statuses, initials} from '../lib/api';

// The dialog primitives are implemented in JavaScript. Casting the wrappers here
// keeps the shared TypeScript components compatible with React 19 JSX children.
const TypedDialog = Dialog as any;
const TypedDialogContent = DialogContent as any;
const TypedDialogHeader = DialogHeader as any;
const TypedDialogTitle = DialogTitle as any;
const TypedDialogDescription = DialogDescription as any;

export const Btn = ({children, testId, secondary = false, small = false, ...props}: any) => (
  <Button data-testid={testId} className={`btn ${secondary ? 'btn-secondary' : 'btn-primary'} ${small ? 'btn-small' : ''}`} {...props}>
    {children}
  </Button>
);

export const IconBtn = ({children, testId, label, ...props}: any) => (
  <button className="icon-btn" data-testid={testId} aria-label={label} title={label} {...props}>
    {children}
  </button>
);

export const Badge = ({status, id}: any) => (
  <span data-testid={`status-${id}`} className={`status-badge status-${status} ${status === 'awaiting' ? 'blink' : ''}`}>
    <i />
    {statuses[status] || status}
  </span>
);

export const Avatar = ({name, size = '', id}: any) => (
  <span data-testid={id || `avatar-${name}`} className={`avatar ${size}`}>
    {initials(name)}
  </span>
);

export const Loading = () => (
  <div className="loading" data-testid="loading-state">
    <Loader2 className="spin" />
    <span>Carregando seu workspace...</span>
  </div>
);

export const Empty = ({text = 'Nenhum registro encontrado', action}: any) => (
  <div className="empty" data-testid="empty-state">
    <Inbox size={30} />
    <p>{text}</p>
    {action}
  </div>
);

export const PageHead = ({eyebrow, title, description, children}: any) => (
  <div className="page-head">
    <div>
      <div className="eyebrow" data-testid="page-eyebrow">{eyebrow || 'ESPAÇO DE TRABALHO'}</div>
      <h1 data-testid="page-title">{title}</h1>
      {description && <p data-testid="page-description">{description}</p>}
    </div>
    <div className="page-actions">{children}</div>
  </div>
);

export const SearchBox = ({value, onChange, placeholder = 'Buscar...', id = 'search'}: any) => (
  <div className="search-box">
    <Search size={17} />
    <input data-testid={id} value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

export const Modal = ({open, onClose, title, children, id = 'form-modal', description}: any) => (
  <TypedDialog open={open} onOpenChange={(value: boolean) => !value && onClose()}>
    <TypedDialogContent data-testid={id} className="app-modal">
      <TypedDialogHeader className="">
        <TypedDialogTitle data-testid={`${id}-title`}>{title}</TypedDialogTitle>
        <TypedDialogDescription
          data-testid={`${id}-description`}
          className={description ? '' : 'sr-only'}
        >
          {description || title}
        </TypedDialogDescription>
      </TypedDialogHeader>
      {children}
    </TypedDialogContent>
  </TypedDialog>
);

export const Field = ({label, id, children, ...props}: any) => (
  <label className="field" htmlFor={id}>
    <span data-testid={`${id}-label`}>{label}</span>
    {children || <input id={id} data-testid={id} {...props} />}
  </label>
);

export const Select = ({id, children, ...props}: any) => (
  <select id={id} data-testid={id} {...props}>{children}</select>
);

export const Stat = ({label, value, icon: Icon, tone = 'blue', detail, id}: any) => (
  <div className={`stat-card ${tone}`} data-testid={`stat-${id}`}>
    <div className="stat-top">
      <span>{label}</span>
      <span className="stat-icon"><Icon size={18} /></span>
    </div>
    <strong data-testid={`stat-${id}-value`}>{value}</strong>
    <div className="stat-bottom">
      <span className="stat-indicator" />
      <span>{detail}</span>
      <ArrowUpRight size={14} />
    </div>
  </div>
);

export {Plus};
