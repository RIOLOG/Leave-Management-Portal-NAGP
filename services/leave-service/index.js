require('dotenv').config();
require('colors');
require('./tracing'); 

const express = require('express');
// const connectDB = require('./config/database');
// const registerWithConsul = require('./config/consul');
// const { connectRabbitMQ } = require('./config/rabbitmq');
const leaveRoutes = require('./routes/leave');
// const errorHandler = require('./middleware/errorHandler');
// const { createLogger } = require('./config/logger');


const connectDB = require('../../shared/config/database');
const { registerWithConsul } = require('../../shared/config/consul');
const { connectRabbitMQ } = require('../../shared/config/rabbitmq');
const errorHandler = require('../../shared/middleware/errorHandler');
const { createLogger } = require('../../shared/config/logger');



const logger = createLogger('leave-service');
const app = express();
const PORT = process.env.PORT || 3003;
const INSTANCE_ID = process.env.INSTANCE_ID || 'leave-service';


app.use(express.json());

// Add instance ID header to every response — for load balancer testing
app.use((req, res, next) => {
  res.setHeader('X-Instance-ID', INSTANCE_ID);
  console.log(`[${INSTANCE_ID}] ${req.method} ${req.path}`);
  next();
});

app.use('/leaves', leaveRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'leave-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    await connectRabbitMQ();

    app.listen(PORT, async () => {
      console.log(`📝 Leave Service [${INSTANCE_ID}] running on port ${PORT}`);
      logger.info(`Leave Service started`, { instanceId: INSTANCE_ID, port: PORT });
      await registerWithConsul('leave-service', 3003);
    });

  } catch (error) {
    console.error(' Failed to start:'.red, error.message);
    logger.error('Failed to start', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

start();