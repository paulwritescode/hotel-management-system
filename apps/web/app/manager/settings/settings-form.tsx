'use client'

import { useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { DashboardShell } from '@/components/shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuthArgs, useBackendAvailable } from '@/components/providers'
import { api } from '@/lib/convex'
import { paymentMethodLabels, paymentMethods, type PaymentMethod } from '@/lib/models'

export function SettingsForm() {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const settings = useQuery(api.restaurants.settings, backend ? auth! : 'skip')
  const update = useMutation(api.restaurants.updateSettings)
  const notify = useToast()
  const [methods, setMethods] = useState<PaymentMethod[]>(['cash', 'mpesa', 'card'])
  const [till, setTill] = useState('123456')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setMethods(settings.acceptedPaymentMethods)
      setTill(settings.mpesaTillNumber ?? '')
    }
  }, [settings])

  function toggle(method: PaymentMethod) {
    setMethods((current) => current.includes(method) ? current.filter((entry) => entry !== method) : [...current, method])
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = till.trim()
    if (methods.includes('mpesa') && trimmed && !/^\d{3,12}$/u.test(trimmed)) { notify('The M-Pesa till number must be 3 to 12 digits', 'error'); return }
    setSaving(true)
    try {
      if (backend) await update({ ...auth!, acceptedPaymentMethods: methods, mpesaTillNumber: trimmed || undefined })
      notify('Payment settings saved')
    } catch { notify('Could not save payment settings', 'error') }
    finally { setSaving(false) }
  }

  return <DashboardShell section="Settings">
    <section className="page-section">
      <div className="section-heading"><div><p className="caption">Restaurant configuration</p><h1>Payment settings</h1><p className="muted">These are shown to diners on the order summary. The system never processes or verifies payment — it records that settlement happened at the counter.</p></div></div>

      <Card>
        <form className="form-stack" onSubmit={submit}>
          <div className="field">
            <span className="field-label">Accepted payment methods</span>
            <p className="fine-print muted">Only the methods you enable appear on the order summary.</p>
            <div className="settings-methods">{paymentMethods.map((method) => <label key={method} className={methods.includes(method) ? 'settings-method settings-method-on' : 'settings-method'}>
              <input type="checkbox" checked={methods.includes(method)} onChange={() => toggle(method)} />
              <span>{paymentMethodLabels[method]}</span>
            </label>)}</div>
          </div>

          <div className="field">
            <label htmlFor="till">M-Pesa till number</label>
            <p className="fine-print muted">Display only. Printed on the summary when M-Pesa is accepted. The system never transacts against it.</p>
            <Input id="till" inputMode="numeric" value={till} onChange={(event) => setTill(event.target.value)} placeholder="e.g. 123456" disabled={!methods.includes('mpesa')} />
          </div>

          <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button></div>
        </form>
      </Card>
    </section>
  </DashboardShell>
}
