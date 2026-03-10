const Question = require('../models/Question');
const Session = require('../models/Session');

// @ desc add question to existing session
// @route POST /api/questions/add
// @access private

exports.addQuestionToSession = async (req, res) => {
    try {
        const {sessionId, question} = req.body;
        if(!sessionId || !question || !Array.isArray(question)){
            return res.status(400).json({message: 'Session ID and question array are required'});
        }

        const session = await Session.findById(sessionId);
        if(!session){
            return res.status(404).json({message: 'Session not found'});
        }

        //Create a new question
        const createdQuestions = await Question.insertMany(
            question.map(q => ({
                session: sessionId,
                question: q.question,
                answer: q.answer,
            }))
        );
        //update session with new question ids
        session.questions.push(...createdQuestions.map(q => q._id));
        await session.save();

        res.status(201).json({message: 'Questions added', questions: createdQuestions});

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

//@ desc pin or unpin a question
//@route POST /api/questions/:id/pin
//@access private
exports.togglePinQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if(!question){
            return res.status(404).json({message: 'Question not found'});
        }
        question.isPinned = !question.isPinned;
        await question.save();
        res.status(200).json({
            message: 'Question pin status updated',
            data: question   // full updated question
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}


// update note for a question
// @route POST /api/questions/:id/note
// @access private

exports.updateQuestionNote = async (req, res) => {
    try {
        const {note} = req.body;
        const question = await Question.findById(req.params.id);

        if(!question){
            return res.status(404).json({message: 'Question not found'});
        }
        question.note = note || '';
        await question.save();

        res.status(200).json({
            message: 'Question note updated',
            data: question   // full updated question
        });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}