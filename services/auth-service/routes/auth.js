const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createLogger } = require('../config/logger');

const logger = createLogger('auth-service');

const router = express.Router();


// ─── POST /auth/login ──────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Step 1 — validate input
    if (!email || !password) {

      logger.warn('Login attempt with missing email or password', { email: email || 'N/A' });

      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Step 2 — find user by email
    const user = await User.findOne({
      email: email.toLowerCase(),
      isActive: true
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Step 3 — compare password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Step 4 — generate JWT token
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      managerId: user.managerId
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    logger.info('User logged in successfully', { userId: user._id, email: user.email });

    // Step 5 — return token
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          userId: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          managerId: user.managerId
        }
      }
    });

  } catch (error) {
    next(error);  // passes to global error handler
  }
});


// ─── GET /auth/verify ──────────────────────────────────
// Gateway calls this to verify token
router.get('/verify', async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.status(200).json({
      success: true,
      data: decoded  // returns decoded payload
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    next(error);
  }
});

module.exports = router;