import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables from production env file
dotenv.config({ path: './env.production' });

// MongoDB connection
async function connectToDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// User Schema (must match your production schema)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  is_admin: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  last_login: { type: Date }
});

const User = mongoose.model('User', userSchema);

async function updateProductionAdmin() {
  try {
    console.log('🔍 Connecting to production MongoDB...');
    await connectToDatabase();
    
    const targetPassword = 'E#po$gPGpmKjEN3z';
    console.log('🔍 Searching for user with password:', targetPassword);
    
    // Get all users to check their passwords
    const users = await User.find({});
    console.log(`📊 Found ${users.length} user(s) in production database`);
    
    let foundUser = null;
    
    // Check each user's password
    for (const user of users) {
      try {
        const isMatch = await bcrypt.compare(targetPassword, user.password_hash);
        if (isMatch) {
          foundUser = user;
          break;
        }
      } catch (error) {
        console.log(`⚠️  Error checking password for ${user.email}:`, error.message);
      }
    }
    
    if (!foundUser) {
      console.log('❌ No user found with that password in production database');
      console.log('💡 This could mean:');
      console.log('   - The password was changed');
      console.log('   - The user was deleted');
      console.log('   - There\'s a different database connection');
      await mongoose.disconnect();
      return;
    }
    
    console.log('👤 User found in production!');
    console.log('📧 Email:', foundUser.email);
    console.log('👑 Current Admin Status:', foundUser.is_admin ? 'Yes' : 'No');
    
    if (foundUser.is_admin) {
      console.log('✅ User is already an admin in production!');
    } else {
      console.log('🔄 Updating user to admin in production...');
      
      // Update user to be admin
      foundUser.is_admin = true;
      await foundUser.save();
      
      console.log('✅ User updated to admin successfully in production!');
    }
    
    // Verify the change
    const updatedUser = await User.findById(foundUser._id);
    console.log('\n🔍 Verification:');
    console.log('ID:', updatedUser._id);
    console.log('Email:', updatedUser.email);
    console.log('Admin:', updatedUser.is_admin ? 'Yes' : 'No');
    console.log('Created:', updatedUser.created_at);
    
    await mongoose.disconnect();
    console.log('\n🎉 Done! You can now login to production with', updatedUser.email, 'and access the User tab.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting:', disconnectError);
    }
  }
}

// Check if MONGODB_URI is set
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  console.log('💡 Please set your production MongoDB connection string in your .env file');
  console.log('   Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/festival-reports');
  process.exit(1);
}

updateProductionAdmin(); 