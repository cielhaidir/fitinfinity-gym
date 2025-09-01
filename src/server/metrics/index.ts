import client from 'prom-client';

// Initialize default Node.js metrics (memory, CPU, event loop, etc.)
client.collectDefaultMetrics({
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // seconds
  prefix: 'nodejs_',
});

// Business KPI Metrics
export const subscriptionsCreatedTotal = new client.Counter({
  name: 'subscriptions_created_total',
  help: 'Total number of subscriptions created',
  labelNames: ['package_type', 'user_type'],
});

export const paymentsSuccessTotal = new client.Counter({
  name: 'payments_success_total',
  help: 'Total number of successful payments',
  labelNames: ['payment_method', 'currency'],
});

export const paymentAmountHistogram = new client.Histogram({
  name: 'payment_amount_histogram',
  help: 'Distribution of payment amounts',
  labelNames: ['payment_method', 'currency'],
  buckets: [10000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000], // IDR amounts
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5, 10], // seconds
});

export const menuNavigationTotal = new client.Counter({
  name: 'menu_navigation_total',
  help: 'Total number of menu navigations',
  labelNames: ['menu_path', 'user_role'],
});

export const pageViewsTotal = new client.Counter({
  name: 'page_views_total',
  help: 'Total number of page views',
  labelNames: ['page_path', 'user_role'],
});

export const activeUsersGauge = new client.Gauge({
  name: 'active_users_current',
  help: 'Current number of active users',
  labelNames: ['user_role'],
});

// Export the default registry for metrics endpoint
export const register = client.register;

// Export the client for custom metrics creation
export default client;