'use client'

import { LoaderCircle, LogIn } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginForm() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const search = useSearchParams()
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('')
    if (!/^\d{4,6}$/u.test(pin)) { setError('Enter a 4–6 digit PIN'); return }
    setBusy(true)
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin }) })
      const data = await response.json() as { error?: string; role?: 'owner' | 'manager' | 'counter' | 'waiter' }
      if (!response.ok || !data.role) throw new Error(data.error ?? 'Unable to sign in')
      const home = data.role === 'owner' ? '/owner' : `/${data.role}`
      const requested = search.get('next')
      const elevated = data.role === 'owner' || data.role === 'manager'
      const allowed = requested && (requested.startsWith(home) || elevated) ? requested : home
      router.replace(allowed); router.refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to sign in') } finally { setBusy(false) }
  }
  return <form className="login-form" onSubmit={submit}><label className="sr-only" htmlFor="pin">Staff PIN</label><Input id="pin" className="pin-input" type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/gu, ''))} aria-describedby={error ? 'login-error' : undefined} autoFocus />{error && <p id="login-error" className="field-error" role="alert">{error}</p>}<Button type="submit" disabled={busy}>{busy ? <><LoaderCircle className="icon-spin" size={17} /><span>Signing in</span></> : <><LogIn size={17} /><span>Sign in</span></>}</Button></form>
}
