import mongoose from 'mongoose';
import Admin from './models/Admin.js';

async function createAdmin() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/fsd2');
    console.log('Connected to MongoDB');

    const admin = new Admin({
      username: 'Test Admin',
      email: 'test@admin.com',
      password: 'password',
      department: 'academic'
    });

    await admin.save();
    console.log('Admin created successfully');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

createAdmin();
