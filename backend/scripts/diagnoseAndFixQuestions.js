const mongoose = require('mongoose');
const Question = require('../models/Question');
const Session = require('../models/Session');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected for diagnostic script');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Advanced function to generate better question text from answer
const generateSmartQuestion = (answer, index) => {
  if (!answer || answer.trim() === '') {
    return `Interview Question ${index + 1}`;
  }

  const cleanAnswer = answer.toLowerCase().trim();
  
  // More sophisticated matching patterns
  const patterns = [
    // MongoDB/Database
    {
      keywords: ['db.collection.find', 'mongodb', 'query data', 'find()', 'database query'],
      questions: [
        'How do you query data in MongoDB?',
        'What are MongoDB find operations?',
        'How do you perform database queries in MongoDB?'
      ]
    },
    
    // React Concepts
    {
      keywords: ['react component', 'jsx', 'component'],
      questions: [
        'What are React components?',
        'How do React components work?',
        'What is JSX in React?'
      ]
    },
    {
      keywords: ['react state', 'usestate', 'state management'],
      questions: [
        'What is state in React?',
        'How do you manage state in React?',
        'What is the useState hook?'
      ]
    },
    {
      keywords: ['react hook', 'useeffect', 'react hooks'],
      questions: [
        'What are React Hooks?',
        'How do React Hooks work?',
        'What is the useEffect hook?'
      ]
    },
    
    // JavaScript Concepts
    {
      keywords: ['javascript closure', 'closure', 'lexical scope'],
      questions: [
        'What are closures in JavaScript?',
        'How do closures work in JavaScript?',
        'What is lexical scoping?'
      ]
    },
    {
      keywords: ['javascript promise', 'promise', 'async/await'],
      questions: [
        'What are Promises in JavaScript?',
        'How do you handle asynchronous operations in JavaScript?',
        'What is async/await?'
      ]
    },
    {
      keywords: ['javascript function', 'arrow function', 'function declaration'],
      questions: [
        'What are JavaScript functions?',
        'What is the difference between function declarations and arrow functions?',
        'How do functions work in JavaScript?'
      ]
    },
    
    // CSS Concepts
    {
      keywords: ['css flexbox', 'flexbox', 'flex container'],
      questions: [
        'What is CSS Flexbox?',
        'How does Flexbox layout work?',
        'What are the properties of Flexbox?'
      ]
    },
    {
      keywords: ['css grid', 'grid layout', 'css grid system'],
      questions: [
        'What is CSS Grid?',
        'How does CSS Grid layout work?',
        'What are CSS Grid properties?'
      ]
    },
    
    // Node.js/Express
    {
      keywords: ['node.js', 'nodejs', 'server-side javascript'],
      questions: [
        'What is Node.js?',
        'How does Node.js work?',
        'What is server-side JavaScript?'
      ]
    },
    {
      keywords: ['express', 'express.js', 'middleware'],
      questions: [
        'What is Express.js?',
        'How do you create a web server with Express?',
        'What is middleware in Express?'
      ]
    },
    
    // General Programming
    {
      keywords: ['algorithm', 'sorting algorithm', 'search algorithm'],
      questions: [
        'What are algorithms?',
        'What are sorting algorithms?',
        'How do you implement algorithms?'
      ]
    },
    {
      keywords: ['data structure', 'array', 'object', 'linked list'],
      questions: [
        'What are data structures?',
        'What are the different types of data structures?',
        'How do you choose the right data structure?'
      ]
    }
  ];
  
  // Find matching pattern
  for (const pattern of patterns) {
    for (const keyword of pattern.keywords) {
      if (cleanAnswer.includes(keyword)) {
        // Return a random question from the pattern to avoid duplicates
        const randomIndex = Math.floor(Math.random() * pattern.questions.length);
        return pattern.questions[randomIndex];
      }
    }
  }
  
  // Fallback: Try to create question from answer structure
  if (cleanAnswer.startsWith('you can')) {
    const action = cleanAnswer.substring(8).split('.')[0];
    return `How can you ${action}?`;
  }
  
  if (cleanAnswer.startsWith('this is')) {
    const definition = cleanAnswer.substring(8).split('.')[0];
    return `What is ${definition}?`;
  }
  
  if (cleanAnswer.includes(' is ') && cleanAnswer.split(' ').length < 20) {
    // Try to extract the subject
    const parts = cleanAnswer.split(' is ');
    if (parts[0].length < 30) {
      return `What is ${parts[0]}?`;
    }
  }
  
  // Final fallback with more context
  return `Technical Interview Question ${index + 1}`;
};

// Main diagnostic and fix function
const diagnoseAndFix = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Starting comprehensive question diagnostic...\n');
    
    // Get all questions with their sessions
    const questions = await Question.find({}).populate('session');
    console.log(`📊 Total questions in database: ${questions.length}\n`);
    
    if (questions.length === 0) {
      console.log('❌ No questions found in database!');
      return;
    }
    
    // Analyze questions
    const issues = {
      emptyQuestions: [],
      genericQuestions: [],
      duplicateQuestions: {},
      mismatchedQA: [],
      totalIssues: 0
    };
    
    console.log('🔍 Analyzing questions for issues...\n');
    
    questions.forEach((q, index) => {
      const questionText = q.question || '';
      const answerText = q.answer || '';
      
      // Check for empty or generic questions
      if (!questionText || questionText.trim() === '') {
        issues.emptyQuestions.push(q);
        issues.totalIssues++;
      } else if (questionText.includes('Interview Question') || questionText.includes('Question ')) {
        issues.genericQuestions.push(q);
        issues.totalIssues++;
      }
      
      // Check for duplicates
      const normalizedQuestion = questionText.toLowerCase().trim();
      if (issues.duplicateQuestions[normalizedQuestion]) {
        issues.duplicateQuestions[normalizedQuestion].push(q);
      } else {
        issues.duplicateQuestions[normalizedQuestion] = [q];
      }
      
      // Check for potential mismatches (very basic check)
      if (questionText.toLowerCase().includes('react') && !answerText.toLowerCase().includes('react')) {
        issues.mismatchedQA.push(q);
        issues.totalIssues++;
      }
      if (questionText.toLowerCase().includes('javascript') && !answerText.toLowerCase().includes('javascript')) {
        issues.mismatchedQA.push(q);
        issues.totalIssues++;
      }
    });
    
    // Find actual duplicates (more than 1 question with same text)
    const realDuplicates = Object.entries(issues.duplicateQuestions)
      .filter(([text, questions]) => questions.length > 1 && text !== '');
    
    // Report findings
    console.log('📋 DIAGNOSTIC RESULTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Total questions analyzed: ${questions.length}`);
    console.log(`❌ Empty questions: ${issues.emptyQuestions.length}`);
    console.log(`🔄 Generic questions: ${issues.genericQuestions.length}`);
    console.log(`👥 Duplicate question sets: ${realDuplicates.length}`);
    console.log(`⚠️  Potential Q&A mismatches: ${issues.mismatchedQA.length}`);
    console.log(`📊 Total issues found: ${issues.totalIssues}\n`);
    
    // Show duplicates
    if (realDuplicates.length > 0) {
      console.log('👥 DUPLICATE QUESTIONS FOUND:');
      realDuplicates.forEach(([questionText, duplicates]) => {
        console.log(`\n"${questionText}" appears ${duplicates.length} times:`);
        duplicates.forEach(q => {
          console.log(`   - ID: ${q._id} (Session: ${q.session?.role || 'Unknown'})`);
        });
      });
      console.log();
    }
    
    // Ask if user wants to proceed with fixes
    console.log('🛠️  PROPOSED FIXES:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Fix empty questions with smart question generation');
    console.log('2. Replace generic questions with contextual ones');
    console.log('3. Make duplicate questions unique');
    console.log('4. Review and fix mismatched Q&A pairs\n');
    
    // Proceed with fixes automatically (you can comment this out to make it interactive)
    console.log('🚀 Starting automatic fixes...\n');
    
    let fixedCount = 0;
    
    // Fix empty questions
    for (const question of issues.emptyQuestions) {
      const newQuestion = generateSmartQuestion(question.answer, questions.indexOf(question) + 1);
      await Question.findByIdAndUpdate(question._id, { question: newQuestion });
      console.log(`✅ Fixed empty question: "${newQuestion}"`);
      fixedCount++;
    }
    
    // Fix generic questions
    for (const question of issues.genericQuestions) {
      const newQuestion = generateSmartQuestion(question.answer, questions.indexOf(question) + 1);
      if (newQuestion !== question.question) {
        await Question.findByIdAndUpdate(question._id, { question: newQuestion });
        console.log(`🔄 Updated generic question: "${question.question}" → "${newQuestion}"`);
        fixedCount++;
      }
    }
    
    // Fix duplicates by making them unique
    for (const [questionText, duplicates] of realDuplicates) {
      if (duplicates.length > 1) {
        for (let i = 1; i < duplicates.length; i++) {
          const question = duplicates[i];
          const newQuestion = generateSmartQuestion(question.answer, i + 1);
          await Question.findByIdAndUpdate(question._id, { question: newQuestion });
          console.log(`👥 Fixed duplicate: "${questionText}" → "${newQuestion}"`);
          fixedCount++;
        }
      }
    }
    
    console.log(`\n🎉 COMPLETED! Fixed ${fixedCount} questions.`);
    console.log('\n📝 RECOMMENDATIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Test your React app now - questions should display properly');
    console.log('2. For future sessions, ensure AI generates proper Q&A pairs');
    console.log('3. Consider adding validation in your backend before saving questions');
    console.log('4. Monitor new questions for quality\n');
    
  } catch (error) {
    console.error('❌ Error in diagnostic:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📝 Database connection closed');
    process.exit(0);
  }
};

// Run the diagnostic and fix
console.log('🚀 Starting comprehensive question diagnostic and fix...\n');
diagnoseAndFix();