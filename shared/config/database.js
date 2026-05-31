require('colors');
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Set globally — this is the only way that works in Mongoose 8+
    // bufferTimeoutMS in connect() options is ignored
    mongoose.set('bufferTimeoutMS', 60000);

    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(` MongoDB connected: ${conn.connection.host}`.green);

    mongoose.connection.on('disconnected', () => {
      console.log(' MongoDB disconnected'.yellow);
    });

  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`.red);
    process.exit(1);
  }
};

module.exports = connectDB;