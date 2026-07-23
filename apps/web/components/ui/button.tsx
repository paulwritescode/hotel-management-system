import {
  Archive,
  Check,
  ChefHat,
  Pencil,
  Plus,
  Printer,
  Save,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'danger'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'default' | 'small' | 'icon'
  icon?: LucideIcon | false
}

const actionIcons: Array<[RegExp, LucideIcon]> = [
  [/^(add|new|create)\b/iu, Plus],
  [/^(save|update)\b/iu, Save],
  [/^(edit|set new pin)\b/iu, Pencil],
  [/^archive\b/iu, Archive],
  [/^(remove|clear)\b/iu, Trash2],
  [/^print\b/iu, Printer],
  [/^(import|upload)\b/iu, Upload],
  [/^(acknowledge|mark ready|mark served)\b/iu, Check],
  [/^start preparing\b/iu, ChefHat],
  [/^(cancel|discard)\b/iu, X],
]

function textContent(children: ReactNode): string | null {
  return typeof children === 'string' ? children.trim() : null
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className = '', variant = 'default', size = 'default', icon, children, ...props }, ref) {
  const label = textContent(children)
  const InferredIcon = icon === false ? undefined : icon ?? (label ? actionIcons.find(([pattern]) => pattern.test(label))?.[1] : undefined)
  return <button ref={ref} className={`button button-${variant} button-${size} ${className}`} {...props}>{InferredIcon && <InferredIcon size={16} aria-hidden="true" />} {children}</button>
})
