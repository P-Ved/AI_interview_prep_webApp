const Question = require("../models/Question")

const questionAnswerPrompt = (role, experience, topicToFocus, numberOfQuestions) => `
You are an interviewing expert. Create exactly ${numberOfQuestions} SHORT, RELEVANT interview questions for a ${role} with ${experience} experience focused ONLY on "${topicToFocus}".

Rules:
- Start from fundamentals and progress to advanced (ordered list from basic → intermediate → advanced).
- Keep EACH question concise (max 2–3 lines).
- Stay strictly on the selected topic; avoid unrelated areas.
- For each question, also generate a brief, interview-ready answer (2–3 lines). No long essays.
- Output MUST be valid JSON array only in this exact shape:
[
  {"question": "...", "answer": "..."}
]
`;


const conceptExplainPrompt = (question) => `
You are an expert software teacher.
Explain the following interview question in simple, beginner-friendly language and progress from basics → advanced.

- Question: "${question}"
- Keep sentences short and clear; avoid jargon unless explained.
- Use bullet points where helpful.
- If code is needed, include fenced code blocks with the correct language label (for example \`\`\`javascript, \`\`\`python, \`\`\`java).
- Prefer minimal, runnable snippets.
- Return output as JSON like this:
{
  "title": "Short descriptive title",
  "explanation": "One or more paragraphs. You may include fenced code blocks."
}

Important: Only return JSON. No extra text.
`;


module.exports = { questionAnswerPrompt, conceptExplainPrompt };
