const questionAnswerPrompt = (role, experience, topicToFocus, numberOfQuestions) => `
You are an interview coach.
Generate exactly ${numberOfQuestions} interview Q&A pairs for:
- Role: ${role}
- Experience: ${experience}
- Topic: ${topicToFocus}

Rules:
1. Keep each question short and practical.
2. Keep each answer to 1-2 concise sentences.
3. Cover progression from fundamental to advanced.
4. Avoid duplicates and avoid unrelated topics.
5. Return JSON only in this exact shape:
{
  "questions": [
    {"question": "...", "answer": "..."}
  ]
}
Do not include markdown or extra keys.
`;

const conceptExplainPrompt = (question) => `
You are an expert software teacher.
Explain the following interview question in simple, beginner-friendly language and progress from basics to advanced.

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
