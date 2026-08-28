export function Button({ children, variant = 'primary', className = '', disabled, ...props }) {
  const variants = {
    primary:
      'bg-forest text-white hover:bg-pine active:bg-sage-800 disabled:opacity-50 disabled:cursor-not-allowed',
    secondary:
      'bg-surface text-forest border border-divider hover:bg-sage-50 active:bg-sage-100 disabled:opacity-50',
    ghost: 'bg-transparent text-sage-700 hover:bg-sage-50 active:bg-sage-100',
    danger: 'bg-alert text-white hover:opacity-90 active:opacity-80',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-text-secondary">{label}</label>
      )}
      <input
        className={`rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20 ${
          error ? 'border-alert' : 'border-divider'
        }`}
        {...props}
      />
      {error && <span className="text-xs text-alert">{error}</span>}
    </div>
  );
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-text-secondary">{label}</label>
      )}
      <select
        className={`rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20 ${
          error ? 'border-alert' : 'border-divider'
        }`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-alert">{error}</span>}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-divider/80 p-6 shadow-sm backdrop-blur-md ${className.includes('bg-') ? '' : 'bg-surface/95'} ${className}`}>
      {children}
    </div>
  );
}

export function Alert({ children, variant = 'info' }) {
  const variants = {
    info: 'bg-sage-50 text-sage-800 border-sage-200',
    success: 'bg-mint/40 text-forest border-sage-300',
    error: 'bg-alert-muted text-alert border-alert/30',
    warning: 'bg-warning-muted text-amber-800 border-warning/30',
  };

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${variants[variant]}`}>
      {children}
    </div>
  );
}

export function Logo({ size = 'md', variant = 'dark' }) {
  const sizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  };

  const isLight = variant === 'light';

  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isLight ? 'bg-white/15 backdrop-blur-sm' : 'bg-forest'}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 8h12v2H6V8zm0 4h8v2H6v-2zm0 4h10v2H6v-2z"
            fill="#D8F3DC"
          />
          <circle cx="18" cy="7" r="3" fill="#52B788" />
        </svg>
      </div>
      <div>
        <div className={`font-semibold ${isLight ? 'text-white' : 'text-forest'} ${sizes[size]}`}>
          EcoCampus
        </div>
        <div className={`text-[11px] font-medium uppercase tracking-wider ${isLight ? 'text-white/70' : 'text-text-muted'}`}>
          Smart Waste Platform
        </div>
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-sage-200 border-t-forest" />
  );
}
