import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in' }
export default function LoginPage() {
  return <main className="login-page">
    <div className="container">
      <section className="login-stack mx-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="login-logo" src="/logo-2.png" alt="Heavenly Foods" />
        <h1 className="sr-only">Heavenly Foods</h1>
        <p className="caption">Staff access</p>
        <p className="muted">Enter your 4–6 digit PIN to open your workspace</p>
        <Suspense fallback={<p className="caption muted">Preparing secure sign in</p>}><LoginForm /></Suspense>
      </section>
    </div>
  </main>
}
