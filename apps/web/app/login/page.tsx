import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in' }
type LoginPageProps = { searchParams: Promise<{ actor?: string; next?: string }> }

function actorLabel(actor?: string, next?: string) {
  if (actor === 'admin') return 'Admin'
  if (actor === 'manager' || next?.startsWith('/manager')) return 'Manager'
  if (actor === 'waiter' || next?.startsWith('/waiter')) return 'Waiter'
  if (actor === 'counter' || next?.startsWith('/counter')) return next?.startsWith('/counter/kitchen') ? 'Kitchen counter' : 'Payment counter'
  if (next?.startsWith('/owner')) return 'Owner'
  return 'Staff'
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const label = actorLabel(params.actor, params.next)
  return <main className="login-page">
    <div className="container">
      <section className="login-stack mx-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="login-logo" src="/logo-2.png" alt="Heavenly Foods" />
        <h1 className="sr-only">Heavenly Foods</h1>
        <p className="caption">{label} login</p>
        <p className="muted">Enter your 4–6 digit PIN to open your workspace</p>
        <Suspense fallback={<p className="caption muted">Preparing secure sign in</p>}><LoginForm /></Suspense>
      </section>
    </div>
  </main>
}
