require('dotenv').config();
require('color');

const { connectAndListen } = require('./config/rabbitmq');
const { processNotification } = require('./config/notifications');

console.log('Notification Service starting...'.bgGreen);
console.log('   No HTTP server — event driven only'.yellow);

// Connect to RabbitMQ and start listening
connectAndListen(processNotification);