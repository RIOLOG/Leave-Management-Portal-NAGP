require('colors');
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
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