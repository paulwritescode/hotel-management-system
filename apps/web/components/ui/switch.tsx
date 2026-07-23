import type { ButtonHTMLAttributes } from 'react'

export function Switch({ checked, className = '', ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'role'> & { checked: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} className={`switch ${checked ? 'switch-on' : ''} ${className}`} {...props}><span className="switch-thumb" /></button>
}
