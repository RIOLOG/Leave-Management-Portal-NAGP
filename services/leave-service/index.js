require('dotenv').config();
require('colors');
require('./tracing'); 

const express = require('express');
const connectDB = require('./config/database');
const registerWithConsul = require('./config/consul');
const { connectRabbitMQ } = require('./config/rabbitmq');
const leaveRoutes = require('./routes/leave');
const errorHandler = require('./middleware/errorHandler');
const { createLogger } = require('./config/logger');


const logger = createLogger('leave-service');
const app = express();
const PORT = process.env.PORT || 3003;


app.use(express.json());
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
      console.log(` Leave Service running on port ${PORT}`.green);
      logger.info(`Leave Service started on port ${PORT}`);
      await registerWithConsul();
    });

  } catch (error) {
    console.error(' Failed to start:'.red, error.message);
    logger.error('Failed to start', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

start();