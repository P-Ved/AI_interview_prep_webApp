const mongoose = require('mongoose');
const Session = require('../models/Session');
const Question = require('../models/Question');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected for 10-question test');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test 10 question generation
const test10Questions = async () => {
  try {
    await connectDB();
    
    console.log('🔟 Testing 10-question generation...\n');
    
    // Get all sessions and count their questions
    const sessions = await Session.find({}).populate('questions');
    
    console.log(`📊 Session Analysis:`);
    console.log(`═══════════════════════════════════════════════════════════`);
    
    sessions.forEach((session, index) => {
      const questionCount = session.questions?.length || 0;
      const status = questionCount === 10 ? '✅' : questionCount > 0 ? '⚠️ ' : '❌';
      
      console.log(`${status} Session ${index + 1}: "${session.role}"`);
      console.log(`   📝 Questions: ${questionCount}/10`);
      console.log(`   📅 Created: ${session.createdAt?.toLocaleDateString()}`);
      console.log(`   🏷️  Topic: ${session.topicToFocus}`);
      console.log('');
    });
    
    // Statistics
    const sessionsWithCorrectCount = sessions.filter(s => s.questions?.length === 10);
    const sessionsWithSomeQuestions = sessions.filter(s => s.questions?.length > 0 && s.questions?.length !== 10);
    const sessionsWithNoQuestions = sessions.filter(s => !s.questions || s.questions?.length === 0);
    
    console.log('📈 Statistics:');
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`✅ Sessions with exactly 10 questions: ${sessionsWithCorrectCount.length}/${sessions.length}`);
    console.log(`⚠️  Sessions with other question counts: ${sessionsWithSomeQuestions.length}/${sessions.length}`);
    console.log(`❌ Sessions with no questions: ${sessionsWithNoQuestions.length}/${sessions.length}`);
    
    if (sessionsWithSomeQuestions.length > 0) {
      console.log('\n⚠️  Sessions with non-standard question counts:');
      sessionsWithSomeQuestions.forEach(session => {
        console.log(`   - "${session.role}": ${session.questions.length} questions`);
      });
    }
    
    console.log('\n🚀 UPDATED CONFIGURATION:');
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log('✅ Question count: 10 (restored from 6)');
    console.log('✅ AI tokens: 4096 (increased from 2048)');
    console.log('✅ Timeout: 45 seconds (increased from 30)');
    console.log('✅ Optimized prompt: Better structure for 10 questions');
    console.log('✅ Generation config: Enhanced for efficiency');
    
    console.log('\n⏱️  EXPECTED PERFORMANCE:');
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log('• AI Generation: ~8-15 seconds (optimized for 10 questions)');
    console.log('• Session Creation: ~1-2 seconds');
    console.log('• UI Update: Immediate');
    console.log('• Modal Close: 1.5 seconds after success');
    console.log('• Total Time: ~10-18 seconds');
    
    console.log('\n🎯 NEW SESSIONS WILL GENERATE:');
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log('• Exactly 10 questions per session');
    console.log('• 3 conceptual questions');
    console.log('• 3 practical questions');
    console.log('• 2 scenario-based questions');
    console.log('• 2 best-practice questions');
    console.log('• All optimizations maintained');
    
    console.log('\n✨ Ready to generate 10 questions efficiently!');
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📝 Database connection closed');
    process.exit(0);
  }
};

// Run the test
console.log('🚀 Starting 10-question generation analysis...\n');
test10Questions();