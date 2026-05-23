import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: React.ReactNode
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-primary text-white hover:bg-brand-primary-hover active:bg-brand-primary-hover shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:shadow-[0_0_28px_rgba(99,102,241,0.25)]',
  secondary:
    'bg-bg-elevated border border-border-default text-text-primary hover:bg-bg-surface hover:border-border-strong',
  ghost: 'bg-transparent text-text-muted hover:bg-white/[0.06] hover:text-text-primary',
  danger:
    'bg-status-error/10 border border-status-error/20 text-status-error hover:bg-status-error/20 hover:border-status-error/40'
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[12px] gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-[13px] gap-2 rounded-lg',
  lg: 'h-11 px-5 text-[14px] gap-2.5 rounded-xl'
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`
        inline-flex items-center justify-center font-semibold
        transition-all duration-200 ease-out
        disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `.trim()}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : icon ? (
        <span className="shrink-0 flex items-center">{icon}</span>
      ) : null}
      {children}
    </button>
  )
}
