const ROUTES = [
  {
    prefix: '/api/auth',
    serviceName: 'auth-service',
    stripPrefix: true,
    // /api/auth/login → /auth/login
    targetPrefix: '/auth'
  },
  {
    prefix: '/api/employees',
    serviceName: 'employee-service',
    stripPrefix: true,
    // /api/employees/123 → /employees/123
    targetPrefix: '/employees'
  },
  {
    prefix: '/api/leaves',
    serviceName: 'leave-service',
    stripPrefix: true,
    // /api/leaves → /leaves
    targetPrefix: '/leaves'
  }
];

module.exports = ROUTES;