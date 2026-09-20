import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

// ─── GLASS NAVBAR ──────────────────────────────
export function GlassNavbar({ children, className = '', style = {} }) {
  return (
    <nav className={`glass-navbar ${className}`} style={style}>
      {children}
    </nav>
  );
}

// ─── GLASS CARD (CLEAN OPEN CONTAINER) ─────────
export function GlassCard({
  children,
  strong = false,
  className = '',
  style = {},
  onClick,
  ...props
}) {
  return (
    <div
      className={`open-container ${className}`}
      style={{
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        borderRadius: 0,
        ...style,
      }}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── GLASS BUTTON ──────────────────────────────
export function GlassButton({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost'
  className = '',
  style = {},
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) {
  const baseClass = variant === 'primary' ? 'btn-glass-primary' : 'btn-glass-secondary';
  return (
    <button
      type={type}
      className={`${baseClass} ${className}`}
      style={style}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── GLASS INPUT ───────────────────────────────
export function GlassInput({
  type = 'text',
  placeholder = '',
  value,
  onChange,
  className = '',
  style = {},
  icon: Icon = null,
  ...props
}) {
  if (Icon) {
    return (
      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
        <Icon
          size={16}
          style={{
            position: 'absolute',
            left: 14,
            color: 'var(--muted, #56657F)',
            pointerEvents: 'none',
          }}
        />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`glass-input ${className}`}
          style={{ paddingLeft: 40, ...style }}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`glass-input ${className}`}
      style={style}
      {...props}
    />
  );
}

// ─── GLASS CHIP ────────────────────────────────
export function GlassChip({
  children,
  variant = 'default', // 'default' | 'primary' | 'amber' | 'teal'
  className = '',
  style = {},
  icon: Icon = null,
}) {
  let variantClass = '';
  if (variant === 'primary') variantClass = 'glass-chip-primary';
  else if (variant === 'amber') variantClass = 'glass-chip-amber';
  else if (variant === 'teal') variantClass = 'glass-chip-teal';

  return (
    <span className={`glass-chip ${variantClass} ${className}`} style={style}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}

// ─── GLASS PROGRESS BAR ────────────────────────
export function GlassProgressBar({
  value = 0,
  max = 100,
  showLabel = false,
  className = '',
  style = {},
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div style={{ width: '100%', ...style }}>
      {showLabel && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--ink, #12203A)',
          }}
        >
          <span>Progress</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--blue, #2F5BFF)' }}>
            {Math.round(pct)}%
          </span>
        </div>
      )}
      <div className={`glass-progress-track ${className}`}>
        <div className="glass-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── GLASS MODAL ───────────────────────────────
export function GlassModal({
  isOpen = false,
  onClose,
  title,
  children,
  maxWidth = 520,
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose?.();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="glass-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={modalRef}
        className="glass-modal"
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          {title && (
            <h3
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 700,
                fontFamily: 'var(--font-heading, "Bricolage Grotesque", sans-serif)',
                color: 'var(--ink, #12203A)',
              }}
            >
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted, #56657F)',
              padding: 4,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── AMBIENT GLOWS CONTAINER ───────────────────
export function AmbientGlows() {
  return (
    <div className="ambient-glows">
      <div className="ambient-glow-blue" />
      <div className="ambient-glow-teal" />
      <div className="ambient-glow-amber" />
    </div>
  );
}
