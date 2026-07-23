'use client'

import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { createContext, useContext, useMemo } from 'react'
import type { AuthArgs } from '@/lib/convex'

const configuredUrl = process.env.NEXT_PUBLIC_CONVEX_URL

export type InitialAuth = AuthArgs & {
  staffId: string
  name: string
  role: 'owner' | 'manager' | 'counter' | 'waiter'
}

type BackendContextValue = {
  available: boolean
  auth: InitialAuth | null
}

const BackendContext = createContext<BackendContextValue>({ available: Boolean(configuredUrl), auth: null })

export function useBackendAvailable() {
  return useContext(BackendContext).available
}

export function useAuthArgs(): AuthArgs | null {
  const { available, auth } = useContext(BackendContext)
  if (available && !auth) throw new Error('A verified staff session is required for connected data')
  return auth ? { token: auth.token, restaurantId: auth.restaurantId } : null
}

export function useStaffIdentity(): Omit<InitialAuth, keyof AuthArgs> | null {
  const { auth } = useContext(BackendContext)
  return auth ? { staffId: auth.staffId, name: auth.name, role: auth.role } : null
}

export function Providers({ children, initialAuth }: { children: React.ReactNode; initialAuth: InitialAuth | null }) {
  const client = useMemo(() => new ConvexReactClient(configuredUrl ?? 'https://demo.invalid'), [])
  const value = useMemo(() => ({ available: Boolean(configuredUrl), auth: initialAuth }), [initialAuth])
  return <BackendContext.Provider value={value}><ConvexProvider client={client}>{children}</ConvexProvider></BackendContext.Provider>
}
