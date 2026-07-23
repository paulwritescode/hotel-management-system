import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from './lib/session'

const roleHome = { owner: '/manager', counter: '/counter', waiter: '/waiter', manager: '/manager' } as const

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET)
  if (pathname === '/login') {
    if (session) return NextResponse.redirect(new URL(roleHome[session.role], request.url))
    return NextResponse.next()
  }
  if (!session) {
    const login = new URL('/login', request.url)
    login.searchParams.set('next', pathname)
    return NextResponse.redirect(login)
  }
  const permitted = pathname.startsWith('/manager') ? ['manager', 'owner'].includes(session.role) : pathname.startsWith('/counter') ? ['counter', 'manager', 'owner'].includes(session.role) : session.role === 'waiter'
  if (!permitted) return NextResponse.redirect(new URL(roleHome[session.role], request.url))
  const response = NextResponse.next()
  response.headers.set('x-staff-name', encodeURIComponent(session.name))
  response.headers.set('x-staff-role', session.role)
  return response
}

export const config = { matcher: ['/login', '/counter/:path*', '/waiter/:path*', '/manager/:path*'] }
