require('colors');

const amqplib = require('amqplib');

const EXCHANGE_NAME = 'lms_exchange';
const EXCHANGE_TYPE = 'topic';
const QUEUE_NAME = 'notification_queue';

// All events notification service cares about
const BINDING_KEYS = [
  'leave.applied',
  'leave.approved',
  'leave.rejected',
  'leave.approval.failed'
];

const connectAndListen = async (processNotification) => {
  try {
    const connection = await amqplib.connect(
      process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'
    );

    const channel = await connection.createChannel();
    console.log('Notification Service connected to RabbitMQ'.green);

    // Declare exchange
    await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
      durable: true
    });

    // Declare queue
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    // Bind to ALL notification events
    for (const key of BINDING_KEYS) {
      await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, key);
      console.log(`Listening for: ${key}`.green);
    }

    channel.prefetch(1);

    // Start consuming
    channel.consume(QUEUE_NAME, async (message) => {
      if (!message) return;

      try {
        const content = JSON.parse(message.content.toString());
        const { eventType, data } = content;

        console.log(`\nEvent received: ${eventType}`.bgBlue);

        // Process notification
        await processNotification(eventType, data);

        channel.ack(message);
        console.log(`Notification processed`.green);

      } catch (error) {
        console.error('Error processing notification:'.red, error.message);
        channel.nack(message, false, false); // don't requeue
      }
    });

    // Handle errors
    connection.on('error', (err) => {
      console.error('RabbitMQ error:'.red, err.message);
      setTimeout(() => connectAndListen(processNotification), 5000);
    });

    connection.on('close', () => {
      console.error('RabbitMQ closed. Retrying...'.red);
      setTimeout(() => connectAndListen(processNotification), 5000);
    });

  } catch (error) {
    console.error('RabbitMQ connection failed:'.red, error.message);
    setTimeout(() => connectAndListen(processNotification), 5000);
  }
};

module.exports = { connectAndListen };