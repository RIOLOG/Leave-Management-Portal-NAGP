require('dotenv').config();

const express = require('express');
const connectDB = require('./config/database');
const registerWithConsul = require('./config/consul');
const { connectRabbitMQ } = require('./config/rabbitmq');
const seedUsers = require('./config/seedUsers');
const authRoutes = require('./routes/auth');
const errorHandler = require('./middleware/errorHandler');

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

    // Step 3 — seed initial users
    await seedUsers();

    // Step 4 — start HTTP server
    app.listen(PORT, async () => {
      console.log(`🔐 Auth Service running on port ${PORT}`);

      // Step 5 — register with Consul
      await registerWithConsul();
    });

  } catch (error) {
    console.error('Failed to start Auth Service:', error.message);
    process.exit(1);
  }
};

start();