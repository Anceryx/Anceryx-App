import React from 'react'

export interface ToggleSwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  ariaLabel?: string
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={[
      'relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500',
      'w-10 h-6 shrink-0',
      checked  ? 'bg-purple-600' : 'bg-zinc-600',
      disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
    ].join(' ')}
  >
    <span
      className={[
        'inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200',
        checked ? 'translate-x-5' : 'translate-x-1',
      ].join(' ')}
    />
  </button>
)

export default ToggleSwitch
