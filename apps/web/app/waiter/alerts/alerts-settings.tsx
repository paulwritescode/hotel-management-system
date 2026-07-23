'use client'

import { useEffect, useState } from 'react'
import { DashboardShell } from '@/components/shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { startAlarm, stopAlarm, unlockAudio, vibrate } from '@/lib/alarm'

const ALERTS_KEY = 'hf-waiter-alerts'

export function AlertsSettings() {
  const notify = useToast()
  const [alertsOn, setAlertsOn] = useState(false)
  const [notifyState, setNotifyState] = useState<'unsupported' | NotificationPermission>('unsupported')

  useEffect(() => {
    setAlertsOn(typeof localStorage !== 'undefined' && localStorage.getItem(ALERTS_KEY) === 'on')
    if (typeof Notification !== 'undefined') setNotifyState(Notification.permission)
  }, [])

  function toggleAlerts() {
    const next = !alertsOn
    if (next) unlockAudio()
    if (typeof localStorage !== 'undefined') localStorage.setItem(ALERTS_KEY, next ? 'on' : 'off')
    setAlertsOn(next)
    notify(next ? 'Order alerts on for this device' : 'Order alerts off')
  }

  async function askNotifications() {
    if (typeof Notification === 'undefined') { notify('This browser does not support notifications', 'error'); return }
    try { const result = await Notification.requestPermission(); setNotifyState(result); notify(result === 'granted' ? 'Notifications allowed' : 'Notifications not allowed') }
    catch { notify('Could not request notification permission', 'error') }
  }

  function testAlarm() {
    unlockAudio(); startAlarm(); vibrate()
    window.setTimeout(() => stopAlarm(), 3000)
    notify('Playing a 3-second test alarm')
  }

  return <DashboardShell role="waiter" section="Alerts">
    <section className="page-section page-section-narrow">
      <div className="section-heading"><div><p className="caption">Device settings</p><h1>Order alerts</h1><p className="muted">Alerts run on this device while the app is open. Install the app for the best experience on your phone.</p></div></div>

      <Card>
        <div className="settings-row">
          <div><strong>Sound alarm</strong><p className="fine-print muted">Plays a repeating alarm and shows a full-screen order card when a table is ready.</p></div>
          <Switch checked={alertsOn} onClick={toggleAlerts} aria-label="Toggle order sound alarm" />
        </div>
        <div className="settings-row">
          <div><strong>Notifications</strong><p className="fine-print muted">{notifyState === 'granted' ? 'Allowed — you will get a notification when an order is ready.' : notifyState === 'denied' ? 'Blocked in your browser settings.' : notifyState === 'unsupported' ? 'Not supported on this browser.' : 'Allow notifications for order alerts.'}</p></div>
          <Button size="small" variant="secondary" disabled={notifyState === 'granted' || notifyState === 'unsupported'} onClick={askNotifications}>{notifyState === 'granted' ? 'Allowed' : 'Allow'}</Button>
        </div>
        <div className="settings-row">
          <div><strong>Test the alarm</strong><p className="fine-print muted">Play a short alarm now to check your volume.</p></div>
          <Button size="small" variant="secondary" onClick={testAlarm}>Test</Button>
        </div>
      </Card>

      <p className="fine-print muted alerts-note">Note: the app cannot use your phone's system alarm clock. Alerts work while Heavenly Foods is open or installed as an app. Background delivery when fully closed isn't enabled yet.</p>
    </section>
  </DashboardShell>
}
