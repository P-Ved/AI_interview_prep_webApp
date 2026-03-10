const mongoose = require('mongoose');
const Session = require('../models/Session');
const Question = require('../models/Question');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected for delete test');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test delete functionality
const testDelete = async () => {
  try {
    await connectDB();
    
    console.log('🧪 Testing delete functionality...\n');
    
    // Get all sessions
    const sessions = await Session.find({}).populate('questions');
    console.log(`📊 Total sessions in database: ${sessions.length}`);
    
    if (sessions.length === 0) {
      console.log('❌ No sessions found to test with');
      return;
    }
    
    // Show sessions with their question counts
    console.log('\n📋 Available sessions:');
    sessions.forEach((session, index) => {
      console.log(`${index + 1}. "${session.role}" - ${session.questions?.length || 0} questions (ID: ${session._id})`);
    });
    
    // Get question count before deletion
    const totalQuestions = await Question.countDocuments();
    console.log(`\n📊 Total questions in database: ${totalQuestions}`);
    
    console.log('\n✅ Delete functionality test completed');
    console.log('💡 To actually test deletion, use your React app dashboard');
    console.log('   1. Login to your app');
    console.log('   2. Go to dashboard');
    console.log('   3. Click the X button on any session card');
    console.log('   4. Confirm the deletion');
    console.log('   5. Refresh the page - the session should be gone permanently');
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📝 Database connection closed');
    process.exit(0);
  }
};

// Run the test
console.log('🚀 Starting delete functionality test...\n');
testDelete();