require('dotenv').config();
require('colors');

const express = require('express');
const connectDB = require('./config/database');
const { registerWithConsul } = require('./config/consul');
const { connectRabbitMQ } = require('./config/rabbitmq');
const { startListeners } = require('./config/listeners');
const employeeRoutes = require('./routes/employee');
const errorHandler = require('./middleware/errorHandler');
const { createLogger } = require('./config/logger');

const logger = createLogger('employee-service');

const app = express();
const PORT = process.env.PORT || 3002;

// ─── Middleware ───────────────────────────────────────
app.use(express.json());

// ─── Routes ───────────────────────────────────────────
app.use('/employees', employeeRoutes);

// ─── Health Check ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'employee-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ─── Global Error Handler ─────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────
const start = async () => {
  try {
    // Step 1 — connect MongoDB
    await connectDB();

    // Step 2 — connect RabbitMQ + start listeners
    const channel = await connectRabbitMQ();
    if (channel) {
      await startListeners(channel);
    }

    // Step 3 — start HTTP server
    app.listen(PORT, async () => {
      console.log(` Employee Service running on port ${PORT}`.green);
      logger.info(`Employee Service started on port ${PORT}`);

      // Step 4 — register with Consul
      await registerWithConsul();
    });

  } catch (error) {
    console.error('Failed to start Employee Service:', error.message.red);
    logger.error('Failed to start Employee Service', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

start();