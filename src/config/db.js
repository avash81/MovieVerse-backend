const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI || typeof mongoURI !== 'string') {
    console.error('MongoDB connection error: MONGO_URI is undefined or not a string. Check .env file in root directory.');
    process.exit(1);
  }
  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;