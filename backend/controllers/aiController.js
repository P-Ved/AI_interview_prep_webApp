const OpenAI = require("openai");
const { questionAnswerPrompt, conceptExplainPrompt } = require("../utils/prompts");

const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const DEFAULT_RETRY_AFTER_SEC = 60;

const QUESTIONS_MODEL = process.env.OPENAI_MODEL_QUESTIONS || "gpt-4o-mini";
const EXPLAIN_MODEL = process.env.OPENAI_MODEL_EXPLAIN || "gpt-4o-mini";

function isRateLimitError(err) {
  return err?.status === 429 || err?.code === 429 || err?.code === "rate_limit_exceeded";
}

function getProviderErrorMessage(err) {
  const msg =
    err?.error?.message ||
    err?.response?.data?.error?.message ||
    err?.message ||
    "";

  if (String(msg).toLowerCase().includes("insufficient_quota")) {
    return "OpenAI quota exhausted for this project. Please add billing/credits or use another project key.";
  }

  return msg;
}

function getResponseHeaders(err) {
  return err?.headers || err?.response?.headers || {};
}

// Helper: retry wrapper for transient errors (handles 429 with Retry-After)
async function callWithRetry(fn, maxRetries = 1) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const serverRetry = extractRetryDelaySec(err);
      if (serverRetry && isRateLimitError(err)) {
        throw err; // controller will read Retry-After and return 429 promptly
      }
      if (!isRateLimitError(err) || attempt > maxRetries) throw err;

      let retryDelaySec = DEFAULT_RETRY_AFTER_SEC;
      if (serverRetry) retryDelaySec = serverRetry;

      const backoffMs = Math.max(1000 * Math.pow(2, attempt - 1), retryDelaySec * 1000);
      console.warn(`AI request 429: retrying attempt ${attempt} after ${backoffMs}ms`);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
}
// Helper: pull retryDelay seconds from provider error objects
function extractRetryDelaySec(err) {
  try {
    const headers = getResponseHeaders(err);
    const retryAfterHeader = headers?.["retry-after"] || headers?.["Retry-After"];
    if (retryAfterHeader) {
      const asNumber = Number(retryAfterHeader);
      if (!Number.isNaN(asNumber)) return Math.ceil(asNumber);
    }

    const msg = String(err?.message || "");
    // Generic fallback for messages containing "in 23s"
    const m = /in\s+([0-9.]+)\s*s/i.exec(msg);
    if (m) {
      return Math.ceil(parseFloat(m[1]));
    }
  } catch (e) {}
  return null;
}

function extractOpenAIText(response) {
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => (item?.type === "text" ? item.text : ""))
      .join("")
      .trim();
  }
  return "";
}

function ensureApiKey(res) {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ message: "OPENAI_API_KEY is not configured on server" });
    return false;
  }
  return true;
}

// @desc Generate interview questions and answers
const generateInterviewQuestions = async (req, res) => {
  try {
    if (!ensureApiKey(res)) return;

    const { role, experience, topicToFocus, numberOfQuestions } = req.body;

    if (!role || !experience || !topicToFocus || !numberOfQuestions) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    console.log(`🤖 Generating ${numberOfQuestions} questions for ${role} (${experience}) focusing on ${topicToFocus}`);
    
    const prompt = questionAnswerPrompt(role, experience, topicToFocus, numberOfQuestions);

    const startTime = Date.now();
    let response;
    try {
      response = await callWithRetry(() => ai.chat.completions.create({
        model: QUESTIONS_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 900,
        response_format: { type: "json_object" },
        temperature: 0.4,
      }));
    } catch (err) {
      const retryAfter = extractRetryDelaySec(err);
      if (isRateLimitError(err)) {
        const normalizedRetryAfter = retryAfter || DEFAULT_RETRY_AFTER_SEC;
        const providerMessage = getProviderErrorMessage(err) || "AI quota exceeded, retry later";
        res.set('Retry-After', String(normalizedRetryAfter));
        return res.status(429).json({ message: providerMessage, retryAfter: normalizedRetryAfter });
      }
      throw err;
    }

    const generationTime = Date.now() - startTime;
    console.log(`✅ AI generation completed in ${generationTime}ms`);

    // Extract text safely
    const rawText = extractOpenAIText(response);
    console.log('📝 Raw AI response length:', rawText.length);

    let cleanedText = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

    try {
      const parsed = JSON.parse(cleanedText);
      const data = Array.isArray(parsed) ? parsed : parsed.questions || parsed.data || [];
      
      // Validate the response
      if (!Array.isArray(data)) {
        throw new Error('AI response is not an array');
      }
      
      if (data.length !== numberOfQuestions) {
        console.warn(`⚠️  Expected ${numberOfQuestions} questions, got ${data.length}`);
      }
      
      // Validate each question has required fields
      const validQuestions = data.filter(q => q.question && q.answer);
      console.log(`✅ Generated ${validQuestions.length} valid questions`);
      
      // Ensure we have the requested number of questions
      if (validQuestions.length < numberOfQuestions) {
        console.warn(`⚠️  Only generated ${validQuestions.length}/${numberOfQuestions} questions. AI may need retry.`);
        
        // Still return what we have, but log the issue
        if (validQuestions.length === 0) {
          throw new Error(`AI failed to generate any valid questions`);
        }
      }
      
      // Log success
      if (validQuestions.length === numberOfQuestions) {
        console.log(`✅ Perfect! Generated exactly ${numberOfQuestions} questions as requested`);
      }
      
      res.status(200).json(validQuestions);
      
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      console.error('❌ Cleaned text:', cleanedText.substring(0, 500));
      throw new Error('Invalid JSON response from AI');
    }

  } catch (error) {
    console.error("❌ Error in generateInterviewQuestions:", error);
    res.status(500).json({ 
      message: "Failed to generate questions", 
      error: error.message,
      details: "AI service temporarily unavailable. Please try again."
    });
  }
};

// @desc Generate explanation for a concept
const generateConceptExplanation = async (req, res) => {
  try {
    if (!ensureApiKey(res)) return;

    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const prompt = conceptExplainPrompt(question);

    let response;
    try {
      response = await callWithRetry(() => ai.chat.completions.create({
        model: EXPLAIN_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.4,
        response_format: { type: "json_object" },
      }));
    } catch (err) {
      const retryAfter = extractRetryDelaySec(err);
      if (isRateLimitError(err)) {
        const normalizedRetryAfter = retryAfter || DEFAULT_RETRY_AFTER_SEC;
        const providerMessage = getProviderErrorMessage(err) || "AI quota exceeded, retry later";
        res.set('Retry-After', String(normalizedRetryAfter));
        return res.status(429).json({ message: providerMessage, retryAfter: normalizedRetryAfter });
      }
      throw err;
    }

    const rawText = extractOpenAIText(response);

    // The model should return JSON, but be resilient if it doesn't.
    let cleanedText = rawText
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let data;
    try {
      data = JSON.parse(cleanedText);
    } catch (parseErr) {
      // Fallback: wrap raw text as markdown explanation so UI never breaks
      console.warn("⚠️ Falling back to markdown explanation (invalid JSON)");
      data = {
        title: question,
        explanation: rawText && rawText.length > 0 ? rawText : "No detailed explanation available."
      };
    }

    // Normalize explanation to an array of paragraphs for the UI component
    if (data.explanation) {
      if (Array.isArray(data.explanation)) {
        // already array
      } else if (typeof data.explanation === 'string') {
        const paragraphs = data.explanation
          .split(/\n{1,}/)
          .map(line => line.trim())
          .filter(line => line.length > 0);
        data.explanation = paragraphs.length ? paragraphs : [data.explanation];
      } else {
        data.explanation = [String(data.explanation)];
      }
    } else {
      data.explanation = ["No detailed explanation available."];
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in generateConceptExplanation:", error);
    // Safe fallback so the client always gets a response
    return res.status(200).json({
      title: "Explanation",
      explanation: ["We couldn't parse a structured explanation right now. Please try again."]
    });
  }
};

module.exports = { generateInterviewQuestions, generateConceptExplanation };
