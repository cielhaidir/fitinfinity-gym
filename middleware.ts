import { NextRequest, NextResponse } from 'next/server';

// Note: Prometheus metrics (prom-client) cannot be used in Edge Runtime middleware
// because it uses Node.js APIs like process.uptime that are not available.
// Metrics collection should be done in API routes instead.

export function middleware(request: NextRequest) {
  const url = new URL(request.url);
  
  // Skip metrics endpoint
  if (url.pathname === '/api/metrics') {
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - api/metrics (to avoid recursion)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};