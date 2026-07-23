import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

export function TableWrap({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`table-wrap ${className}`} {...props} /> }
export function Table({ className = '', ...props }: TableHTMLAttributes<HTMLTableElement>) { return <table className={`table ${className}`} {...props} /> }
export function Th(props: ThHTMLAttributes<HTMLTableCellElement>) { return <th {...props} /> }
export function Td(props: TdHTMLAttributes<HTMLTableCellElement>) { return <td {...props} /> }
