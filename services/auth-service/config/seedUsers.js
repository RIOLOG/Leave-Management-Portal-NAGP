const User = require('../models/User');
const { publishEvent } = require('./rabbitmq');

const seedUsers = async () => {
  try {

    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      console.log('Users already seeded — skipping');
      return;
    }

    console.log('Seeding initial users...');

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

    console.log('Users seeded successfully!');

  } catch (error) {
    console.error('Seeding failed:', error.message);
  }
};

module.exports = seedUsers;