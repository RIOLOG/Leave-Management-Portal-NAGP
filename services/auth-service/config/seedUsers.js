require('colors');
const User = require('../models/User');
const { publishEvent } = require('../../../shared/config/rabbitmq');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const seedUsers = async (attempt = 1) => {
  try {
    // Wait 2s on first attempt — Docker topology needs time to stabilize
    // even after mongoose emits 'connected'
    if (attempt === 1) await sleep(2000);

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