import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPaths = ['/login', '/register', '/forgot-password']
const rtlLocales = ['he']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const locale = request.cookies.get('NEXT_LOCALE')?.value || 'en'
  const direction = rtlLocales.includes(locale) ? 'rtl' : 'ltr'

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))
  const authToken = request.cookies.get('authToken')?.value

  if (!isPublicPath && !authToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname === '/login' && authToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const response = NextResponse.next()
  response.headers.set('x-locale', locale)
  response.headers.set('x-direction', direction)

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
