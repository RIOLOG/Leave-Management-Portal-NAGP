require('colors');
const User = require('../models/User');
const { publishEvent, isChannelReady } = require('../../../shared/config/rabbitmq');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const waitForRabbitMQ = async (maxWait = 60000) => {
  const interval = 2000;
  let waited = 0;
  while (!isChannelReady() && waited < maxWait) {
    console.log('Waiting for RabbitMQ channel to be ready...'.yellow);
    await sleep(interval);
    waited += interval;
  }
  if (!isChannelReady()) {
    console.error('RabbitMQ channel not ready after max wait — events may be lost'.red);
  }
};

const seedUsers = async (attempt = 1) => {
  try {
    if (attempt === 1) await waitForRabbitMQ();

    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      console.log('Users already seeded — skipping');
      return;
    }

    console.log('Seeding initial users...'.yellow);

    const manager1 = await User.create({
      name: 'Pankaj',
      email: 'pankaj@nagarro.com',
      password: 'Pankaj123', 
      role: 'manager',
      managerId: null
    });


    // Publish user.created for manager1
    publishEvent('user.created', {
      userId: manager1._id.toString(),
      name: manager1.name,
      email: manager1.email,
      role: manager1.role,
      managerId: null
    });


     const employees = await User.create([
      {
        name: 'Ankit Singh',
        email: 'ankit.singh14@nagarro.com',
        password: 'Ankit123',
        role: 'employee',
        managerId: manager1._id
      }
    ]);

    // Publish user.created for each employee
    employees.forEach(emp => {
      publishEvent('user.created', {
        userId: emp._id.toString(),
        name: emp.name,
        email: emp.email,
        role: emp.role,
        managerId: emp.managerId?.toString() || null
      });
    });

    console.log('Users seeded successfully!'.green);

  } catch (error) {
    if (attempt < 5) {
      console.log(`Seeding attempt ${attempt} failed, retrying in 3s...`.yellow);
      await sleep(3000);
      return seedUsers(attempt + 1);
    }
    console.error(`Seeding failed after ${attempt} attempts: ${error.message}`);
  }
};

module.exports = seedUsers;