import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...props} />
}
export function CardHeader({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`card-header ${className}`} {...props} /> }
export function CardContent({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`card-content ${className}`} {...props} /> }
