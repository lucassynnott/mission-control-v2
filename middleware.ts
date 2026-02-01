import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_USER = 'lucas'
const AUTH_PASS = 'Spartansneverdie!1'

export function middleware(request: NextRequest) {
  const basicAuth = request.headers.get('authorization')
  
  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const [user, pwd] = atob(authValue).split(':')
    
    if (user === AUTH_USER && pwd === AUTH_PASS) {
      return NextResponse.next()
    }
  }
  
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Mission Control v2.0"'
    }
  })
}

export const config = {
  matcher: '/:path*'
}
