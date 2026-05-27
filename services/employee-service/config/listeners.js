const amqplib = require('amqplib');
const Employee = require('../models/Employee');
const { EXCHANGE_NAME } = require('./rabbitmq');


const QUEUE_NAME = 'employee_user_created_queue';
const ROUTING_KEY = 'user.created';


// ─── Start Listening ───────────────────────────────────
const startListeners = async (channel) => {
  try {
    // Declare queue
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    // Bind queue to exchange
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

    console.log(`Employee Service listening for: ${ROUTING_KEY}`);

    channel.prefetch(1);

    // Start consuming
    channel.consume(QUEUE_NAME, async (message) => {
      if (!message) return;

      try {
        const content = JSON.parse(message.content.toString());
        const { eventType, data } = content;

        console.log(`\n Event received: ${eventType}`);

        if (eventType === 'user.created') {
          await handleUserCreated(data);
        }

        channel.ack(message);
        console.log(`Event processed: ${eventType}\n`);

      } catch (error) {
        console.error('Error processing event:', error.message);
        // nack — don't requeue to avoid infinite loop
        channel.nack(message, false, false);
      }
    });

  } catch (error) {
    console.error('Listener setup failed:', error.message);
  }
};

// ─── Handle user.created event ────────────────────────
const handleUserCreated = async (data) => {
  try {
    // Check if employee already exists
    const existing = await Employee.findOne({ userId: data.userId });

    if (existing) {
      console.log(`Employee already exists for userId: ${data.userId}`);
      return;
    }

    // Create employee profile with leave balance
    const employee = await Employee.create({
      userId: data.userId,
      name: data.name,
      email: data.email,
      role: data.role,
      managerId: data.managerId || null,
      leaveBalance: {
        casual:    { total: 12, used: 0, remaining: 12 },
        sick:      { total: 10, used: 0, remaining: 10 },
        privilege: { total: 15, used: 0, remaining: 15 }
      }
    });

    console.log(`Employee profile created: ${employee.name} (${employee.role})`);
    console.log(`   Leave balance initialized:`);
    console.log(`   Casual: 12 | Sick: 10 | Privilege: 15`);

  } catch (error) {
    console.error('Failed to create employee profile:', error.message);
    throw error;  // rethrow so nack is triggered
  }
};

module.exports = { startListeners };