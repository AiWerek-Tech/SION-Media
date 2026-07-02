/**
 * Phase 5 — Design System: Input
 *
 * Unified input component with label, helper text, and error states.
 */

import React, { forwardRef } from 'react'

type InputSize = 'sm' | 'md' | 'lg'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Optional label above the input */
  label?: string
  /** Helper or error text below the input */
  helperText?: string
  /** Show error styling */
  error?: boolean
  /** Leading icon node */
  icon?: React.ReactNode
  /** Input size variant */
  inputSize?: InputSize
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-7 text-[11px] px-2.5',
  md: 'h-8 text-[12px] px-3',
  lg: 'h-10 text-[13px] px-4'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, error = false, icon, inputSize = 'md', className = '', ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.04em]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-2.5 text-text-muted pointer-events-none flex items-center">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-lg border bg-bg-elevated text-text-primary
            placeholder:text-text-disabled outline-none
            transition-all duration-200
            focus:ring-1 focus:ring-brand-primary/40 focus:border-brand-primary/60
            ${error ? 'border-danger/50 focus:ring-danger/40 focus:border-danger/60' : 'border-border-default hover:border-border-strong'}
            ${icon ? 'pl-8' : ''}
            ${sizeClasses[inputSize]}
            ${className}
          `.trim()}
          {...props}
        />
      </div>
      {helperText && (
        <span className={`text-[10px] ${error ? 'text-danger' : 'text-text-muted'}`}>
          {helperText}
        </span>
      )}
    </div>
  )
})
