
require('colors');

const amqplib = require('amqplib');

const EXCHANGE_NAME = 'lms_exchange';
const EXCHANGE_TYPE = 'topic';

let channel = null;

// ─── Connect to RabbitMQ ───────────────────────────────
const connectRabbitMQ = async () => {
  try {
    const connection = await amqplib.connect(
      process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'
    );

    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
      durable: true
    });

    console.log('Employee Service connected to RabbitMQ'.green);

    connection.on('error', (err) => {
      console.error('RabbitMQ error:', err.message.red);
      channel = null;
      setTimeout(connectRabbitMQ, 5000);
    });

    connection.on('close', () => {
      console.error('RabbitMQ connection closed. Retrying...'.red);
      channel = null;
      setTimeout(connectRabbitMQ, 5000);
    });

    return channel;

  } catch (error) {
    console.error('RabbitMQ connection failed:', error.message.red);
    setTimeout(connectRabbitMQ, 5000);
    return null;
  }
};

const getChannel = () => channel;

module.exports = { connectRabbitMQ, getChannel, EXCHANGE_NAME };