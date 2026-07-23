import type { ButtonHTMLAttributes, HTMLAttributes } from 'react'

export function Tabs({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) { return <div role="tablist" className={`tabs ${className}`} {...props} /> }
export function Tab({ active, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) { return <button type="button" role="tab" aria-selected={active} className={`tab ${active ? 'tab-active' : ''}`} {...props} /> }
