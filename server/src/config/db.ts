import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/team_collaboration';
    await mongoose.connect(mongoUri);
    console.log(`[Database] MongoDB Connected successfully: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('[Database] MongoDB connection failure:', error);
    // Don't crash process instantly in dev, log warning
  }
};
