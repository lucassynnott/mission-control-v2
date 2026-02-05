import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_USER = 'lucas'
const AUTH_PASS = 'Spartansneverdie!1'

// Service tokens for agent API access
const VALID_SERVICE_TOKENS = [
  {
    client_id: 'b3d10235afaf5f66d48fd95857261125.access',
    client_secret: '1c49e8bd150d8c60b845891e90ef52261db6593db91a8324a06f3f78d47d6c27'
  },
  {
    client_id: '7842cda5be7b8a8ffb488d343058fc24.access',
    client_secret: 'e110a80dc299a9ea0ce45d9225c39df3e88cadfe986c2665f287c1777d8b5421'
  }
]

function validateServiceToken(clientId: string | null, clientSecret: string | null): boolean {
  if (!clientId || !clientSecret) return false
  return VALID_SERVICE_TOKENS.some(
    token => token.client_id === clientId && token.client_secret === clientSecret
  )
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Whitelist SSE endpoint (browser EventSource can't send auth headers)
  // This is safe because:
  // 1. It's read-only (only receives events)
  // 2. UI pages require basic auth
  // 3. Behind Cloudflare Tunnel
  if (pathname === '/api/sse') {
    return NextResponse.next()
  }
  
  // API routes: check service token OR basic auth
  if (pathname.startsWith('/api/')) {
    const clientId = request.headers.get('cf-access-client-id')
    const clientSecret = request.headers.get('cf-access-client-secret')
    
    // Allow service token authentication
    if (validateServiceToken(clientId, clientSecret)) {
      return NextResponse.next()
    }
    
    // Also allow basic auth for API endpoints (for browser-based requests)
    const basicAuth = request.headers.get('authorization')
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [user, pwd] = atob(authValue).split(':')
      
      if (user === AUTH_USER && pwd === AUTH_PASS) {
        return NextResponse.next()
      }
    }
    
    // Return JSON for API routes
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // UI routes: check basic auth
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
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}
