import { NextRequest, NextResponse } from 'next/server';
import { httpRequestsTotal, httpRequestDuration } from '@/server/metrics';

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const method = request.method;
  const url = new URL(request.url);
  
  // Normalize route to remove dynamic segments for better grouping
  let route = url.pathname;
  
  // Replace common dynamic segments with placeholders
  route = route.replace(/\/[0-9a-f-]{36}/, '/:id'); // UUIDs
  route = route.replace(/\/\d+/, '/:id'); // Numeric IDs
  route = route.replace(/\/[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+$/, '/:param/:param'); // Two params at end
  
  // Skip metrics endpoint itself to avoid recursion
  if (route === '/api/metrics') {
    return NextResponse.next();
  }
  
  const response = NextResponse.next();
  
  // Use setTimeout to record metrics after response is sent
  setTimeout(() => {
    try {
      // Measure request duration
      const duration = (Date.now() - startTime) / 1000;
      
      // Record metrics
      httpRequestsTotal.labels({
        method,
        route,
        status_code: response.status.toString(),
      }).inc();
      
      httpRequestDuration.labels({
        method,
        route,
      }).observe(duration);
    } catch (error) {
      console.error('Error recording metrics:', error);
    }
  });
  
  return response;
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