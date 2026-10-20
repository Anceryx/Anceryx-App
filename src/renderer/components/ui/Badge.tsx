import React from 'react'

export interface BadgeProps {
  count: number
  max?: number
  variant?: 'default' | 'red' | 'gray'
  className?: string
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-accent text-white',
  red: 'bg-accent-red text-white',
  gray: 'bg-zinc-600 text-white'
}

const Badge: React.FC<BadgeProps> = ({
  count,
  max = 99,
  variant = 'default',
  className = ''
}) => {
  if (count <= 0) return null

  const label = count > max ? `${max}+` : String(count)

  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full text-[10px] font-bold leading-none',
        'min-w-[16px] h-4 px-1',
        variantClasses[variant],
        className
      ].join(' ')}
      aria-label={`${count} unread`}
    >
      <span key={count} className="motion-pop-in">{label}</span>
    </span>
  )
}

export default Badge
