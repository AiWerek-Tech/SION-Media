/**
 * Design System — FormField (Molecule)
 *
 * Label + input + error/help text wrapper.
 * Standardizes form layout across all modals and editors.
 */

import React from 'react'

interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
  help?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function FormField({
  label,
  htmlFor,
  error,
  help,
  required = false,
  children,
  className = ''
}: FormFieldProps): React.JSX.Element {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold text-text-secondary flex items-center gap-1"
      >
        {label}
        {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[10px] text-rose-400 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-rose-400 shrink-0" />
          {error}
        </p>
      )}
      {help && !error && <p className="text-[10px] text-text-muted">{help}</p>}
    </div>
  )
}
