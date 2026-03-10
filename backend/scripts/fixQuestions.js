const mongoose = require('mongoose');
const Question = require('../models/Question');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected for fix script');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Function to generate question text based on answer content
const generateQuestionFromAnswer = (answer, index) => {
  if (!answer) return `Interview Question ${index + 1}`;
  
  const lowerAnswer = answer.toLowerCase();
  
  // MongoDB related
  if (lowerAnswer.includes('db.collection') || lowerAnswer.includes('query data') || lowerAnswer.includes('mongodb')) {
    return 'How do you query data in MongoDB?';
  }
  
  // React related
  if (lowerAnswer.includes('react') && lowerAnswer.includes('component')) {
    return 'What are React components?';
  }
  if (lowerAnswer.includes('react') && lowerAnswer.includes('state')) {
    return 'What is state in React?';
  }
  if (lowerAnswer.includes('react') && lowerAnswer.includes('hook')) {
    return 'What are React Hooks?';
  }
  if (lowerAnswer.includes('react')) {
    return 'What is React and how does it work?';
  }
  
  // JavaScript related
  if (lowerAnswer.includes('javascript') && lowerAnswer.includes('closure')) {
    return 'What are closures in JavaScript?';
  }
  if (lowerAnswer.includes('javascript') && lowerAnswer.includes('promise')) {
    return 'What are Promises in JavaScript?';
  }
  if (lowerAnswer.includes('javascript') && lowerAnswer.includes('async')) {
    return 'What is async/await in JavaScript?';
  }
  if (lowerAnswer.includes('javascript')) {
    return 'What is JavaScript?';
  }
  
  // CSS related
  if (lowerAnswer.includes('css') && lowerAnswer.includes('flexbox')) {
    return 'What is CSS Flexbox?';
  }
  if (lowerAnswer.includes('css') && lowerAnswer.includes('grid')) {
    return 'What is CSS Grid?';
  }
  if (lowerAnswer.includes('css')) {
    return 'What is CSS and how does it work?';
  }
  
  // Node.js related
  if (lowerAnswer.includes('node.js') || lowerAnswer.includes('nodejs')) {
    return 'What is Node.js?';
  }
  
  // Express related
  if (lowerAnswer.includes('express') && lowerAnswer.includes('middleware')) {
    return 'What is middleware in Express.js?';
  }
  if (lowerAnswer.includes('express')) {
    return 'What is Express.js?';
  }
  
  // Database related
  if (lowerAnswer.includes('database') && lowerAnswer.includes('sql')) {
    return 'What is SQL and how do you use it?';
  }
  if (lowerAnswer.includes('database')) {
    return 'What are databases?';
  }
  
  // API related
  if (lowerAnswer.includes('api') && lowerAnswer.includes('rest')) {
    return 'What is a REST API?';
  }
  if (lowerAnswer.includes('api')) {
    return 'What are APIs?';
  }
  
  // HTTP related
  if (lowerAnswer.includes('http') && lowerAnswer.includes('get')) {
    return 'What are HTTP methods?';
  }
  
  // Authentication related
  if (lowerAnswer.includes('jwt') || lowerAnswer.includes('token')) {
    return 'What is JWT authentication?';
  }
  if (lowerAnswer.includes('authentication')) {
    return 'What is authentication?';
  }
  
  // Version control related
  if (lowerAnswer.includes('git') && lowerAnswer.includes('branch')) {
    return 'What are Git branches?';
  }
  if (lowerAnswer.includes('git')) {
    return 'What is Git?';
  }
  
  // General programming concepts
  if (lowerAnswer.includes('algorithm')) {
    return 'What are algorithms?';
  }
  if (lowerAnswer.includes('data structure')) {
    return 'What are data structures?';
  }
  if (lowerAnswer.includes('object-oriented') || lowerAnswer.includes('oop')) {
    return 'What is Object-Oriented Programming?';
  }
  
  // Fallback - try to extract the first sentence if it's question-like
  const sentences = answer.split('.').map(s => s.trim());
  const firstSentence = sentences[0];
  
  // If answer starts with "You can...", "This is...", "It is...", etc., create a question
  if (firstSentence.startsWith('You can')) {
    return `How do you ${firstSentence.substring(7).toLowerCase()}?`;
  }
  if (firstSentence.startsWith('This is')) {
    return `What is ${firstSentence.substring(7)}?`;
  }
  if (firstSentence.startsWith('It is')) {
    return `What is it and why ${firstSentence.substring(5).toLowerCase()}?`;
  }
  
  // Final fallback
  return `Interview Question ${index + 1}`;
};

// Main fix function
const fixQuestions = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Finding questions with missing question text...');
    
    // Find all questions that don't have a question field or have empty question field
    const questionsToFix = await Question.find({
      $or: [
        { question: { $exists: false } },
        { question: null },
        { question: '' },
        { question: /^\s*$/ } // empty or whitespace only
      ]
    });
    
    console.log(`📊 Found ${questionsToFix.length} questions to fix`);
    
    if (questionsToFix.length === 0) {
      console.log('✅ No questions need fixing!');
      return;
    }
    
    let fixedCount = 0;
    
    for (let i = 0; i < questionsToFix.length; i++) {
      const question = questionsToFix[i];
      
      console.log(`\n🔧 Fixing question ${i + 1}/${questionsToFix.length}`);
      console.log(`   ID: ${question._id}`);
      console.log(`   Current question: ${question.question || 'MISSING'}`);
      console.log(`   Answer preview: ${(question.answer || '').substring(0, 100)}...`);
      
      // Generate question text from answer
      const generatedQuestion = generateQuestionFromAnswer(question.answer, i + 1);
      
      console.log(`   Generated question: ${generatedQuestion}`);
      
      // Update the question
      await Question.findByIdAndUpdate(question._id, {
        question: generatedQuestion
      });
      
      fixedCount++;
      console.log(`   ✅ Updated successfully`);
    }
    
    console.log(`\n🎉 Fixed ${fixedCount} questions successfully!`);
    console.log('\nRun your React app again to see the questions displayed.');
    
  } catch (error) {
    console.error('❌ Error fixing questions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📝 Database connection closed');
    process.exit(0);
  }
};

// Run the fix
console.log('🚀 Starting database fix for missing question fields...');
fixQuestions();