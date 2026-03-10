const express = require('express');
const { generateInterviewQuestions, generateConceptExplanation } = require('../controllers/aiController');

const router = express.Router();

router.post('/generate-questions', generateInterviewQuestions);
router.post('/concept-explain', generateConceptExplanation);

module.exports = router;
