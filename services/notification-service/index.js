require('dotenv').config();
require('colors');

const { connectAndListen } = require('./config/rabbitmq');
const { processNotification } = require('./config/notifications');
// const { createLogger } = require('./config/logger');

const { createLogger } = require('../../shared/config/logger');

const logger = createLogger('notification-service');

console.log('Notification Service starting...'.bgGreen);
// console.log('   No HTTP server — event driven only'.yellow);
logger.info('Notification Service starting...');


// Connect to RabbitMQ and start listening
connectAndListen(processNotification);