import { NextRequest, NextResponse } from 'next/server';
import { httpRequestsTotal, httpRequestDuration } from '@/server/metrics';

export function metricsMiddleware() {
  return async (request: NextRequest) => {
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
    
    try {
      const response = NextResponse.next();
      
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
      
      return response;
    } catch (error) {
      // Record failed requests
      const duration = (Date.now() - startTime) / 1000;
      
      httpRequestsTotal.labels({
        method,
        route,
        status_code: '500',
      }).inc();
      
      httpRequestDuration.labels({
        method,
        route,
      }).observe(duration);
      
      throw error;
    }
  };
}