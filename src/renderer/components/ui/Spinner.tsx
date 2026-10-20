import React from 'react'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const px = sizeMap[size]

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
      aria-label="Loading"
      role="status"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="31.416"
        strokeDashoffset="10"
        strokeLinecap="round"
        opacity="0.25"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="31.416"
        strokeDashoffset="23"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default Spinner
