const jwt = require('jsonwebtoken');


// ─── Verify JWT Token ──────────────────────────────────
const authenticate = (req, res, next) => {
  try {
    // Option 1 — from Gateway headers (when called via gateway)
    const userIdFromHeader = req.headers['x-user-id'];
    const roleFromHeader = req.headers['x-user-role'];
    const nameFromHeader = req.headers['x-user-name'];

    if (userIdFromHeader && roleFromHeader) {
      // Trust gateway — use headers
      req.user = {
        userId: userIdFromHeader,
        role: roleFromHeader,
        name: nameFromHeader,
        managerId: req.headers['x-user-manager-id'] || null
      };
      return next();
    }

    // Option 2 — direct JWT token (when called directly)
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



// ─── Check Manager Role ────────────────────────────────
const isManager = (req, res, next) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({
      success: false,
      message: 'Access denied — managers only'
    });
  }
  next();
};


// ─── Check Own Data or Manager ────────────────────────
// Employee can only access their own data
// Manager can access any employee data
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