import React from 'react'

export interface TooltipProps {
  content: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  children: React.ReactNode
  className?: string
}

const positionClasses: Record<NonNullable<TooltipProps['side']>, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2'
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  side = 'right',
  children,
  className = ''
}) => {
  return (
    <div className={`relative group inline-flex ${className}`}>
      {children}
      <div
        role="tooltip"
        className={[
          'absolute z-50 pointer-events-none whitespace-nowrap',
          'bg-background-primary text-text-primary text-xs font-medium',
          'px-2 py-1 rounded shadow-lg border border-border',
          'opacity-0 transition-opacity delay-0 duration-100 group-hover:opacity-100 group-hover:delay-150',
          positionClasses[side]
        ].join(' ')}
      >
        {content}
      </div>
    </div>
  )
}

export default Tooltip
