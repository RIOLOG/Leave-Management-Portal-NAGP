const jwt = require('jsonwebtoken');

// Routes that don't need JWT validation
const PUBLIC_ROUTES = [
  { path: '/api/auth/login', method: 'POST' }
];


const isPublicRoute = (req) => {
  return PUBLIC_ROUTES.some(
    route =>
      req.path === route.path &&
      req.method === route.method
  );
};


// ─── JWT Validation Middleware ─────────────────────────
const authenticate = (req, res, next) => {
  try {
    console.log("API ROUTE REQUEST:", req.method, req.path);

    // Skip JWT for public routes
    if (isPublicRoute(req)) {
      return next();
    }

    console.log("Is public route:", isPublicRoute(req));

    // Get token from header
    const authHeader = req.headers['authorization'];


    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied — no token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);


    // Inject user info as headers for downstream services
    req.headers['x-user-id']         = decoded.userId.toString();
    req.headers['x-user-role']        = decoded.role;
    req.headers['x-user-name']        = decoded.name;
    req.headers['x-user-manager-id']  = decoded.managerId
                                          ? decoded.managerId.toString()
                                          : '';
    req.headers['x-user-email']       = decoded.email;

    console.log(`Auth passed: ${decoded.name} (${decoded.role})`);
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired — please login again'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};


// ─── Role Check Middleware ─────────────────────────────
const requireRole = (role) => {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'];

    if (userRole !== role) {
      return res.status(403).json({
        success: false,
        message: `Access denied — ${role}s only`
      });
    }
    next();
  };
};

module.exports = { authenticate, requireRole };