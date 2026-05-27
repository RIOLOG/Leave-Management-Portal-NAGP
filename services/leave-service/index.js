require('dotenv').config();
require('colors');

const express = require('express');
const connectDB = require('./config/database');
const registerWithConsul = require('./config/consul');
const { connectRabbitMQ } = require('./config/rabbitmq');
const leaveRoutes = require('./routes/leave');
const errorHandler = require('./middleware/errorHandler');

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
      await registerWithConsul();
    });

  } catch (error) {
    console.error(' Failed to start:'.red, error.message);
    process.exit(1);
  }
};

start();