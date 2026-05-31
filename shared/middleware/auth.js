const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  try {
    // From Gateway headers (when called via gateway)
    const userIdFromHeader = req.headers['x-user-id'];
    const roleFromHeader = req.headers['x-user-role'];

    if (userIdFromHeader && roleFromHeader) {
      req.user = {
        userId: userIdFromHeader,
        role: roleFromHeader,
        name: req.headers['x-user-name'],
        managerId: req.headers['x-user-manager-id'] || null,
        email: req.headers['x-user-email']
      };
      return next();
    }

    // Direct JWT (when tested using postman directly on this service)
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

const isManager = (req, res, next) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({
      success: false,
      message: 'Access denied — managers only'
    });
  }
  next();
};

const isOwnerOrManager = (req, res, next) => {
  const requestedUserId = req.params.userId;
  const loggedInUserId = req.user.userId.toString();
  const role = req.user.role;

  if (role === 'manager' || loggedInUserId === requestedUserId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied — you can only access your own data'
  });
};

module.exports = { authenticate, isManager, isOwnerOrManager };