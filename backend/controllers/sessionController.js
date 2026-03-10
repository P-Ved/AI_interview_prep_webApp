const Session = require('../models/Session');
const Question = require('../models/Question');


// @ desc create a new sission linking to a question
// @route POST /api/sessions/create
// @access private
exports.createSession = async (req, res) => {
  try {
    const { role, experience, topicToFocus, description, questions } = req.body;
    const userId = req.user._id;

    const session = new Session({
      user: userId,
      role,
      experience,
      topicToFocus,
      description
    });

    // ✅ Add validation and duplicate prevention
    const questionDocs = await Promise.all(
      (questions || []).map(async (q, index) => {
        // Validate question and answer
        if (!q.question || !q.answer) {
          console.warn(`⚠️  Skipping invalid question ${index + 1}: missing question or answer`);
          return null;
        }
        
        // Prevent generic questions
        if (q.question.includes('Interview Question') || q.question.includes('Question ')) {
          console.warn(`⚠️  Generic question detected: ${q.question}`);
        }
        
        const newQ = await Question.create({
          session: session._id,
          question: q.question.trim(),
          answer: q.answer.trim(),
          note: q.note || ''
        });
        
        console.log(`✅ Created question: "${q.question.substring(0, 50)}..."`);
        return newQ._id;
      })
    );
    
    // Filter out null values (invalid questions)
    const validQuestionIds = questionDocs.filter(id => id !== null);

    session.questions = validQuestionIds;
    await session.save();
    
    console.log(`✅ Session created with ${validQuestionIds.length} valid questions`);
    
    res.status(201).json({ 
      success: true, 
      data: session,
      message: `Session created with ${validQuestionIds.length} questions`
    });
  } catch (error) {
    console.error("❌ Error in createSession:", error); // FULL error in terminal
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,    // send actual error
      stack: error.stack       // helpful for debugging
    });
  }
};


// @ desc get my session
// @route GET /api/sessions/my-sessions
// @access private
exports.getMySession = async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'questions',
        options: { sort: { createdAt: -1 } }
      })
      .exec();

    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    console.error("❌ Error in getMySession:", error); // logs full error in terminal
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,   // show actual message in Postman
      stack: error.stack      // optional, full trace for debugging
    });
  }
};


//@ get all sessions by question id
// @route GET /api/sessions/:id
// @access private
exports.getSessionsById = async (req, res) => {
    try {
        const session = await Session.findById(req.params.id).populate({ path: 'questions', options: { sort: { createdAt: -1 } } }).exec();
        if(!session){
            return res.status(404).json({ success:false , message: 'Session not found' });
        }
        res.status(200).json({ success:true , data: session });
    } catch (error) {
        res.status(500).json({ success:false , message: 'Server Error' });
    }
};

// @ desc delete a session by id
// @route DELETE /api/sessions/:id
// @access private
exports.deleteSession = async (req, res) => {   
    try {
        console.log(`🗑️  Delete request for session ID: ${req.params.id}`);
        
        const session = await Session.findById(req.params.id);

        if(!session){
            console.log('❌ Session not found');
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        console.log(`🔍 Found session: "${session.role}" (Owner: ${session.user})`);
        
        //check if the user is the owner of the session
        if(session.user.toString() !== req.user.id){
            console.log(`❌ Unauthorized: User ${req.user.id} tried to delete session owned by ${session.user}`);
            return res.status(401).json({ success: false, message: 'Not authorized to delete this session' });
        }
        
        console.log('✅ User authorization verified');

        // First delete all questions associated with the session
        const deletedQuestions = await Question.deleteMany({ session: session._id });
        console.log(`✅ Deleted ${deletedQuestions.deletedCount} questions`);

        // Then delete the session
        await session.deleteOne();
        console.log(`✅ Session "${session.role}" deleted successfully`);
        
        res.status(200).json({ 
            success: true, 
            message: `Session "${session.role}" deleted successfully`,
            deletedQuestions: deletedQuestions.deletedCount
        });
    } catch (error) {
        console.error('❌ Error in deleteSession:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error while deleting session',
            error: error.message
        });
    } 
};

