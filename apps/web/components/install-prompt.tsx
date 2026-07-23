'use client'

import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

// Shows an install banner when the browser signals the app is installable (Android/Chromium).
// iOS Safari does not fire beforeinstallprompt, so nothing shows there — users add to home
// screen via the share sheet. Dismissal is remembered for the session.
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (sessionStorage.getItem('hf-install-dismissed')) { setHidden(true); return }
    const onPrompt = (raw: Event) => { raw.preventDefault(); setEvent(raw as InstallEvent) }
    const onInstalled = () => setEvent(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])

  if (!event || hidden) return null

  async function install() {
    if (!event) return
    await event.prompt()
    await event.userChoice
    setEvent(null)
  }

  function dismiss() {
    setHidden(true)
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('hf-install-dismissed', '1')
  }

  return <div className="install-prompt" role="dialog" aria-label="Install app">
    <div className="install-prompt-body">
      <Download size={18} />
      <span>Install Heavenly Foods for faster access and order alerts.</span>
    </div>
    <div className="install-prompt-actions">
      <button type="button" className="button button-default button-small" onClick={install}>Install</button>
      <button type="button" className="install-prompt-close" aria-label="Dismiss" onClick={dismiss}><X size={16} /></button>
    </div>
  </div>
}
