import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  type,
  id,
  className = '',
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wide text-text-secondary"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-text-secondary pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          {...rest}
          id={inputId}
          type={inputType}
          className={[
            'w-full rounded-md bg-background-tertiary text-text-primary placeholder-text-secondary',
            'border border-border px-3 py-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
            'motion-field',
            leftIcon ? 'pl-9' : '',
            rightIcon || isPassword ? 'pr-9' : '',
            error ? 'border-accent-red focus:ring-accent-red' : '',
            className
          ].join(' ')}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="motion-control absolute right-3 text-text-secondary hover:text-text-primary"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : rightIcon ? (
          <span className="absolute right-3 text-text-secondary pointer-events-none">
            {rightIcon}
          </span>
        ) : null}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-accent-red" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${inputId}-helper`} className="text-xs text-text-secondary">
          {helperText}
        </p>
      )}
    </div>
  )
}

export default Input
