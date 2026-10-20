import React from 'react'
import Spinner from './Spinner'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-accent hover:bg-accent/90 text-white',
  secondary: 'bg-background-tertiary text-text-primary border border-border hover:bg-background-tertiary/80',
  ghost: 'bg-transparent hover:bg-white/10 text-text-primary',
  danger: 'bg-accent-red hover:bg-accent-red/90 text-white'
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'py-1 px-2 text-xs',
  md: 'py-2 px-4 text-sm',
  lg: 'py-3 px-6 text-base'
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...rest
}) => {
  const isDisabled = disabled || loading

  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={[
        'motion-control inline-flex items-center justify-center gap-2 rounded-md font-medium',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      ].join(' ')}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      {children}
      {!loading && rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
    </button>
  )
}

export default Button
