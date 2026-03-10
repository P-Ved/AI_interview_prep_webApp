const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
    },
    question: {   // <-- ADD THIS
        type: String,
        required: true
    },

    answer: String,
    note: String,
    isPinned: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);