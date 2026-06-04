import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isMockMode = true;

export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.log('⚠️  No MONGODB_URI found in environment. Running in MOCK DATABASE mode (local file storage).');
    isMockMode = true;
    return;
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`🔌 MongoDB Connected: ${conn.connection.host}`);
    isMockMode = false;
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    console.log('⚠️ Falling back to MOCK DATABASE mode (local file storage).');
    isMockMode = true;
  }
};

export { isMockMode };
