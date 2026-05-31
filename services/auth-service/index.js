require('dotenv').config();
require('colors');

const express = require('express');
const seedUsers = require('./config/seedUsers');
const authRoutes = require('./routes/auth');


const connectDB = require('../../shared/config/database');
const { registerWithConsul } = require('../../shared/config/consul');
const { connectRabbitMQ } = require('../../shared/config/rabbitmq');
const { createLogger } = require('../../shared/config/logger');
const errorHandler = require('../../shared/middleware/errorHandler');


const logger = createLogger('auth-service');
const app = express();
const PORT = process.env.PORT || 3001;


// ─── Middleware ───────────────────────────────────────
app.use(express.json());


// ─── Routes ───────────────────────────────────────────
app.use('/auth', authRoutes);


// ─── Health Check ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


// ─── Global Error Handler ─────────────────────────────
app.use(errorHandler);


// ─── Start Server ─────────────────────────────────────
const start = async () => {
  try {
    // Step 1 — connect to MongoDB
    await connectDB();

    // Step 2 — connect RabbitMQ
    await connectRabbitMQ();

    // Step 3 — seed users while connection is fresh
    await seedUsers();

    // Step 4 — start HTTP server
    app.listen(PORT, async () => {
      console.log(`Auth Service running on port ${PORT}`.green);
      logger.info(`Auth Service started on port ${PORT}`);

      // Step 5 — register with Consul
      await registerWithConsul('auth-service', 3001);
    });

  } catch (error) {
    console.error('Failed to start Auth Service:', error.message);
    logger.error('Failed to start Auth Service', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

start();