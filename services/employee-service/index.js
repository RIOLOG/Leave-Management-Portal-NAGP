require('dotenv').config();
require('colors');

const express = require('express');
// const connectDB = require('./config/database');
// const { registerWithConsul } = require('./config/consul');
// const { connectRabbitMQ } = require('./config/rabbitmq');
const { startListeners } = require('./config/listeners');
const employeeRoutes = require('./routes/employee');
// const errorHandler = require('./middleware/errorHandler');
// const { createLogger } = require('./config/logger');


const connectDB = require('../../shared/config/database');
const { registerWithConsul } = require('../../shared/config/consul');
const { connectRabbitMQ, isChannelReady } = require('../../shared/config/rabbitmq');
const errorHandler = require('../../shared/middleware/errorHandler');
const { createLogger } = require('../../shared/config/logger');


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
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const waitForRabbitMQ = async (maxWait = 60000) => {
  const interval = 2000;
  let waited = 0;
  while (!isChannelReady() && waited < maxWait) {
    await sleep(interval);
    waited += interval;
  }
};

const start = async () => {
  try {
    await connectDB();
    connectRabbitMQ();
    await waitForRabbitMQ();
    const { getChannel } = require('../../shared/config/rabbitmq');
    const channel = getChannel();
    if (channel) {
      await startListeners(channel);
    }

    // Step 3 — start HTTP server
    app.listen(PORT, async () => {
      console.log(` Employee Service running on port ${PORT}`.green);
      logger.info(`Employee Service started on port ${PORT}`);

      // Step 4 — register with Consul
      await registerWithConsul('employee-service', 3002);
    });

  } catch (error) {
    console.error('Failed to start Employee Service:', error.message.red);
    logger.error('Failed to start Employee Service', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

start();