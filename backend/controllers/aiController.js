const OpenAI = require("openai");
const { questionAnswerPrompt, conceptExplainPrompt } = require("../utils/prompts");

const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_RETRY_AFTER_SEC = 60;
const DEFAULT_NUMBER_OF_QUESTIONS = 10;
const MIN_NUMBER_OF_QUESTIONS = 1;
const MAX_NUMBER_OF_QUESTIONS = 10;
const QUESTIONS_CACHE_TTL_MS =
  Number(process.env.QUESTIONS_CACHE_TTL_MS) || 6 * 60 * 60 * 1000;
const QUESTIONS_CACHE_MAX_ENTRIES = 200;

const QUESTIONS_MODEL = process.env.OPENAI_MODEL_QUESTIONS || "gpt-4o-mini";
const EXPLAIN_MODEL = process.env.OPENAI_MODEL_EXPLAIN || "gpt-4o-mini";

const questionsCache = new Map();

function sanitizeQuestionCount(rawCount) {
  const parsed = Number(rawCount);
  if (!Number.isFinite(parsed)) return DEFAULT_NUMBER_OF_QUESTIONS;
  const value = Math.trunc(parsed);
  return Math.min(MAX_NUMBER_OF_QUESTIONS, Math.max(MIN_NUMBER_OF_QUESTIONS, value));
}

function buildQuestionsCacheKey(role, experience, topicToFocus, numberOfQuestions) {
  return [role, experience, topicToFocus, numberOfQuestions]
    .map((value) => String(value || "").trim().toLowerCase())
    .join("::");
}

function getCachedQuestions(cacheKey) {
  const cached = questionsCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.createdAt > QUESTIONS_CACHE_TTL_MS) {
    questionsCache.delete(cacheKey);
    return null;
  }

  return cached.questions;
}

function setCachedQuestions(cacheKey, questions) {
  questionsCache.set(cacheKey, { questions, createdAt: Date.now() });

  if (questionsCache.size > QUESTIONS_CACHE_MAX_ENTRIES) {
    const oldestKey = questionsCache.keys().next().value;
    if (oldestKey) questionsCache.delete(oldestKey);
  }
}

function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) return [];

  const seen = new Set();
  const normalized = [];

  for (const item of questions) {
    const question = String(item?.question || "").trim();
    const answer = String(item?.answer || "").trim();

    if (!question || !answer) continue;

    const key = question.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    normalized.push({ question, answer });
  }

  return normalized;
}

function buildFallbackQuestions(role, topicToFocus, count, existingQuestions = []) {
  const roleText = String(role || "the role").trim();
  const topicText = String(topicToFocus || "the topic").trim();
  const existingSet = new Set(
    existingQuestions
      .map((item) => String(item?.question || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const templates = [
    {
      question: `What core fundamentals of ${topicText} are most important for a ${roleText} interview?`,
      answer:
        "Define core concepts clearly, explain why they matter, and include one practical example from a real project.",
    },
    {
      question: `How would you design a simple solution using ${topicText} for a production scenario?`,
      answer:
        "Start with requirements, propose a clear design, and explain trade-offs around scalability, reliability, and maintenance.",
    },
    {
      question: `What common mistakes happen with ${topicText}, and how do you avoid them?`,
      answer:
        "List common pitfalls, describe the impact, and show prevention steps such as validation, testing, and monitoring.",
    },
    {
      question: `How do you debug issues related to ${topicText} during development and production?`,
      answer:
        "Reproduce the issue, inspect logs and metrics, isolate root cause, and confirm the fix with targeted tests.",
    },
    {
      question: `When would you choose one approach over another in ${topicText}?`,
      answer:
        "Compare options by complexity, cost, performance, and team familiarity, then justify the final decision with context.",
    },
    {
      question: `How do you optimize performance when working with ${topicText}?`,
      answer:
        "Measure first, identify bottlenecks, apply focused optimizations, and validate improvements with benchmark comparisons.",
    },
    {
      question: `What security checks should a ${roleText} apply for ${topicText}?`,
      answer:
        "Cover input validation, access control, safe secret handling, and audit logging to reduce common security risks.",
    },
    {
      question: `How do you test and validate solutions built around ${topicText}?`,
      answer:
        "Use unit, integration, and edge-case tests, then automate checks in CI to keep quality consistent.",
    },
    {
      question: `Describe a real-world challenge involving ${topicText} and how you would solve it.`,
      answer:
        "Define the problem, break it into steps, explain implementation details, and include fallback or rollback planning.",
    },
    {
      question: `How would you explain ${topicText} to a junior engineer on your team?`,
      answer:
        "Use plain language, one concrete example, and a simple mental model, then verify understanding with a small exercise.",
    },
  ];

  const fallback = [];

  for (const template of templates) {
    const key = template.question.trim().toLowerCase();
    if (existingSet.has(key)) continue;

    existingSet.add(key);
    fallback.push(template);
    if (fallback.length >= count) break;
  }

  while (fallback.length < count) {
    const index = fallback.length + 1;
    const question = `What interview strategy #${index} would you use to answer ${topicText} questions for a ${roleText} role?`;
    const key = question.toLowerCase();
    if (existingSet.has(key)) continue;

    existingSet.add(key);
    fallback.push({
      question,
      answer:
        "Open with the core idea, give one practical example, and close with a trade-off to demonstrate depth.",
    });
  }

  return fallback.slice(0, count);
}

function isRateLimitError(err) {
  return err?.status === 429 || err?.code === 429 || err?.code === "rate_limit_exceeded";
}

function getProviderErrorMessage(err) {
  const msg = err?.error?.message || err?.response?.data?.error?.message || err?.message || "";

  if (String(msg).toLowerCase().includes("insufficient_quota")) {
    return "OpenAI quota exhausted for this project. Please add billing/credits or use another project key.";
  }

  return msg;
}

function getResponseHeaders(err) {
  return err?.headers || err?.response?.headers || {};
}

async function callWithRetry(fn, maxRetries = 1) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const serverRetry = extractRetryDelaySec(err);
      if (serverRetry && isRateLimitError(err)) {
        throw err;
      }
      if (!isRateLimitError(err) || attempt > maxRetries) throw err;

      let retryDelaySec = DEFAULT_RETRY_AFTER_SEC;
      if (serverRetry) retryDelaySec = serverRetry;

      const backoffMs = Math.max(1000 * Math.pow(2, attempt - 1), retryDelaySec * 1000);
      console.warn(`AI request 429: retrying attempt ${attempt} after ${backoffMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}

function extractRetryDelaySec(err) {
  try {
    const headers = getResponseHeaders(err);
    const retryAfterHeader = headers?.["retry-after"] || headers?.["Retry-After"];
    if (retryAfterHeader) {
      const asNumber = Number(retryAfterHeader);
      if (!Number.isNaN(asNumber)) return Math.ceil(asNumber);
    }

    const msg = String(err?.message || "");
    const match = /in\s+([0-9.]+)\s*s/i.exec(msg);
    if (match) {
      return Math.ceil(parseFloat(match[1]));
    }
  } catch (e) {
    // ignore parse failures
  }
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

    const { role, experience, topicToFocus } = req.body;
    const numberOfQuestions = sanitizeQuestionCount(req.body?.numberOfQuestions);

    if (!String(role || "").trim() || !String(experience || "").trim() || !String(topicToFocus || "").trim()) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    console.log(
      `Generating ${numberOfQuestions} questions for ${role} (${experience}) focusing on ${topicToFocus}`
    );

    const cacheKey = buildQuestionsCacheKey(role, experience, topicToFocus, numberOfQuestions);
    const cachedQuestions = getCachedQuestions(cacheKey);
    if (cachedQuestions) {
      console.log(`Serving ${cachedQuestions.length} questions from cache`);
      return res.status(200).json(cachedQuestions);
    }

    const prompt = questionAnswerPrompt(role, experience, topicToFocus, numberOfQuestions);
    const maxTokens = Math.min(900, Math.max(350, numberOfQuestions * 75));

    const startTime = Date.now();
    let response;
    try {
      response = await callWithRetry(() =>
        ai.chat.completions.create({
          model: QUESTIONS_MODEL,
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
          temperature: 0.3,
        })
      );
    } catch (err) {
      const retryAfter = extractRetryDelaySec(err);
      if (isRateLimitError(err)) {
        const normalizedRetryAfter = retryAfter || DEFAULT_RETRY_AFTER_SEC;
        const providerMessage = getProviderErrorMessage(err) || "AI quota exceeded, retry later";
        res.set("Retry-After", String(normalizedRetryAfter));
        return res.status(429).json({ message: providerMessage, retryAfter: normalizedRetryAfter });
      }
      throw err;
    }

    const generationTime = Date.now() - startTime;
    console.log(`AI generation completed in ${generationTime}ms`);

    const rawText = extractOpenAIText(response);
    console.log("Raw AI response length:", rawText.length);

    const cleanedText = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

    try {
      const parsed = JSON.parse(cleanedText);
      const data = Array.isArray(parsed) ? parsed : parsed.questions || parsed.data || [];

      if (!Array.isArray(data)) {
        throw new Error("AI response is not an array");
      }

      if (data.length !== numberOfQuestions) {
        console.warn(`Expected ${numberOfQuestions} questions, got ${data.length}`);
      }

      const validQuestions = normalizeQuestions(data);
      console.log(`Generated ${validQuestions.length} valid unique questions`);

      let finalQuestions = validQuestions.slice(0, numberOfQuestions);

      if (finalQuestions.length < numberOfQuestions) {
        const needed = numberOfQuestions - finalQuestions.length;
        console.warn(
          `Only generated ${finalQuestions.length}/${numberOfQuestions}. Filling ${needed} with local fallbacks.`
        );
        const fillers = buildFallbackQuestions(role, topicToFocus, needed, finalQuestions);
        finalQuestions = [...finalQuestions, ...fillers];
      }

      if (finalQuestions.length === 0) {
        throw new Error("AI failed to generate any valid questions");
      }

      if (finalQuestions.length === numberOfQuestions) {
        console.log(`Generated exactly ${numberOfQuestions} questions as requested`);
      }

      setCachedQuestions(cacheKey, finalQuestions);
      res.status(200).json(finalQuestions);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Cleaned text:", cleanedText.substring(0, 500));
      const fallbackQuestions = buildFallbackQuestions(role, topicToFocus, numberOfQuestions);
      setCachedQuestions(cacheKey, fallbackQuestions);
      return res.status(200).json(fallbackQuestions);
    }
  } catch (error) {
    console.error("Error in generateInterviewQuestions:", error);
    res.status(500).json({
      message: "Failed to generate questions",
      error: error.message,
      details: "AI service temporarily unavailable. Please try again.",
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
      response = await callWithRetry(() =>
        ai.chat.completions.create({
          model: EXPLAIN_MODEL,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
          temperature: 0.4,
          response_format: { type: "json_object" },
        })
      );
    } catch (err) {
      const retryAfter = extractRetryDelaySec(err);
      if (isRateLimitError(err)) {
        const normalizedRetryAfter = retryAfter || DEFAULT_RETRY_AFTER_SEC;
        const providerMessage = getProviderErrorMessage(err) || "AI quota exceeded, retry later";
        res.set("Retry-After", String(normalizedRetryAfter));
        return res.status(429).json({ message: providerMessage, retryAfter: normalizedRetryAfter });
      }
      throw err;
    }

    const rawText = extractOpenAIText(response);

    const cleanedText = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let data;
    try {
      data = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.warn("Falling back to markdown explanation (invalid JSON)");
      data = {
        title: question,
        explanation: rawText && rawText.length > 0 ? rawText : "No detailed explanation available.",
      };
    }

    if (data.explanation) {
      if (Array.isArray(data.explanation)) {
        // already array
      } else if (typeof data.explanation === "string") {
        const paragraphs = data.explanation
          .split(/\n{1,}/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
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
    return res.status(200).json({
      title: "Explanation",
      explanation: ["We couldn't parse a structured explanation right now. Please try again."],
    });
  }
};

module.exports = { generateInterviewQuestions, generateConceptExplanation };
