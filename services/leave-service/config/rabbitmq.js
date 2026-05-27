require('colors');

const amqplib = require('amqplib');

const EXCHANGE_NAME = 'lms_exchange';
const EXCHANGE_TYPE = 'topic';
let channel = null;

const connectRabbitMQ = async () => {
  try {
    const connection = await amqplib.connect(
      process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'
    );

    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
      durable: true
    });

    console.log(' Leave Service connected to RabbitMQ'.green);

    connection.on('error', (err) => {
      console.error(' RabbitMQ error:'.red, err.message);
      channel = null;
      setTimeout(connectRabbitMQ, 5000);
    });

    connection.on('close', () => {
      console.log(' RabbitMQ connection closed'.yellow);
      channel = null;
      setTimeout(connectRabbitMQ, 5000);
    });

    return channel;

  } catch (error) {
    console.error('RabbitMQ connection failed:'.red, error.message);
    setTimeout(connectRabbitMQ, 5000);
    return null;
  }
};

const publishEvent = (routingKey, data) => {
  try {
    if (!channel) {
      console.error('RabbitMQ channel not available'.red);
      return;
    }

    const message = JSON.stringify({
      eventType: routingKey,
      data,
      timestamp: new Date().toISOString()
    });

    channel.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(message),
      { persistent: true }
    );

    console.log(` Event published: ${routingKey}`.green);

  } catch (error) {
    console.error('Failed to publish event:'.red, error.message);
  }
};

module.exports = { connectRabbitMQ, publishEvent, EXCHANGE_NAME };