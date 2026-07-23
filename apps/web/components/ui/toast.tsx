'use client'

import { CircleCheck, TriangleAlert, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Toast = { id: number; message: string; tone: 'info' | 'error' }
const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const notify = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = Date.now()
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3600)
  }, [])
  return <ToastContext.Provider value={notify}>{children}<div className="toast-region" aria-live="polite">{toasts.map((toast) => <div className={`toast toast-${toast.tone}`} key={toast.id}><span className="toast-message">{toast.tone === 'error' ? <TriangleAlert size={18} /> : <CircleCheck size={18} />}<span>{toast.message}</span></span><button aria-label="Dismiss notification" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}><X size={17} /></button></div>)}</div></ToastContext.Provider>
}
export const useToast = () => useContext(ToastContext)
