// config/db.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // Load .env variables

const connectDB = async () => {
    console.log('🌐 Attempting MongoDB connection...');
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,   // for parsing the MongoDB connection string
      useUnifiedTopology: true // for using the new Server Discover and Monitoring engine
    });
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1); // Stop the server if DB connection fails
  }
};

export default connectDB;
