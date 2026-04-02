const OpenAI = require("openai");

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

function buildInterviewReadyQuestionPrompt(role, experience, topicToFocus, numberOfQuestions) {
  return `
You are a senior technical interviewer and interview coach.
Generate exactly ${numberOfQuestions} interview Q&A pairs for:
- Role: ${role}
- Experience: ${experience}
- Topic: ${topicToFocus}

Goal:
Produce interview-ready answers that sound confident, practical, and impact-driven.

Rules:
1. Questions must be realistic, role-specific, and progress from fundamentals to advanced.
2. Each answer must be 4-6 sentences (about 70-130 words) and include:
   - A direct answer in the first sentence.
   - A practical approach with one concrete example.
   - A measurable impact (real or plausible metric).
   - One trade-off/risk with mitigation.
3. Use clear, concise language with no fluff.
4. Avoid duplicates and unrelated topics.
5. Return JSON only in exactly this shape:
{
  "questions": [
    {"question": "...", "answer": "..."}
  ]
}
Do not include markdown, code fences, or extra keys.
`;
}

function buildDetailedConceptPrompt(question, answer = "") {
  return `
You are an expert technical interview mentor.
Explain the following interview question in depth so a candidate can answer confidently.

Question:
"${question}"

Candidate's current answer (optional context):
"${answer || "Not provided"}"

Build a detailed explanation from fundamentals to advanced depth.
Include:
1. What the interviewer is evaluating.
2. Core concepts and mental model.
3. Step-by-step reasoning path for solving/answering.
4. Strong interview answer framework (what to say first, next, and last).
5. Common mistakes and better alternatives.
6. A strong sample answer.
7. 2-3 likely follow-up questions with short guidance.

Return JSON only in exactly this shape:
{
  "title": "Short descriptive title",
  "explanation": [
    "## Section heading\\nDetailed markdown content...",
    "## Another heading\\nDetailed markdown content..."
  ]
}

Formatting constraints:
- explanation must be an array with 5 to 8 detailed markdown sections.
- each section should contain short paragraphs and/or bullet points.
- include a short code snippet only when truly relevant.
- no extra keys, no surrounding markdown fences.
`;
}

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
        `For ${topicText}, I focus first on core concepts, then connect them to system behavior and business outcomes for a ${roleText} role. In practice, I explain one real project decision where these fundamentals shaped architecture or debugging speed. This approach usually improves delivery confidence because teams can reason about failures instead of guessing. One measured impact I mention is reducing production issue turnaround by 30-40% through clearer root-cause analysis. The trade-off is initial learning time, which I mitigate with focused documentation and repeatable checklists.`,
    },
    {
      question: `How would you design a simple solution using ${topicText} for a production scenario?`,
      answer:
        `I start by clarifying requirements, constraints, and success metrics before proposing a simple design around ${topicText}. Then I break the solution into components, define data flow, and call out failure handling from day one. I usually include one concrete example from a production-style workflow to show practical feasibility. This structure creates impact by reducing rework and helping teams ship predictable releases faster. The trade-off is slightly more upfront design effort, mitigated by keeping scope tight and iterating in small milestones.`,
    },
    {
      question: `What common mistakes happen with ${topicText}, and how do you avoid them?`,
      answer:
        `A common mistake in ${topicText} is optimizing too early without measuring bottlenecks or edge cases. I prevent this by validating assumptions with logs, tests, and baseline metrics before making changes. In interviews, I share an example where this approach avoided unnecessary complexity and improved stability. The impact is better engineering decisions and fewer regressions after deployment. The trade-off is extra analysis time, which I control by time-boxing diagnosis and focusing only on high-risk paths.`,
    },
    {
      question: `How do you debug issues related to ${topicText} during development and production?`,
      answer:
        `My debugging strategy for ${topicText} is to reproduce the issue quickly, then narrow scope with logs, metrics, and controlled tests. I isolate one variable at a time so the root cause is evidence-based rather than assumption-driven. I describe a production example where this method shortened incident resolution and prevented repeat failures. The impact is faster recovery and higher trust in fixes, often reflected in reduced incident duration. The trade-off is disciplined process overhead, mitigated by reusable runbooks and targeted observability.`,
    },
    {
      question: `When would you choose one approach over another in ${topicText}?`,
      answer:
        `I compare approaches for ${topicText} using complexity, scalability, maintainability, and team execution speed. Then I map each option to business priorities like reliability targets or delivery timelines. In interviews, I explain one concrete decision where I chose a simpler architecture first and upgraded later. This creates impact by balancing short-term delivery with long-term sustainability. The trade-off is potentially delayed optimization, which I mitigate by defining trigger metrics for when to evolve the design.`,
    },
    {
      question: `How do you optimize performance when working with ${topicText}?`,
      answer:
        `I optimize ${topicText} by measuring baseline performance first, then prioritizing the biggest bottleneck instead of scattered tweaks. I apply focused changes, validate with benchmarks, and compare before-and-after metrics. I typically present one example where this raised throughput or reduced latency without major refactoring. The impact is meaningful performance gains with controlled engineering effort. The trade-off is that some low-priority issues remain, which I manage through a metric-driven optimization backlog.`,
    },
    {
      question: `What security checks should a ${roleText} apply for ${topicText}?`,
      answer:
        `For ${topicText}, I prioritize input validation, authorization boundaries, secret hygiene, and audit visibility. I explain how these controls map directly to common exploit paths and operational risk. In interviews, I include one practical scenario where tightening access checks prevented data exposure. The impact is reduced security incidents and better compliance readiness. The trade-off is additional implementation complexity, which I mitigate with shared middleware, security linting, and automated policy checks.`,
    },
    {
      question: `How do you test and validate solutions built around ${topicText}?`,
      answer:
        `I validate ${topicText} solutions with a layered strategy: unit tests for logic, integration tests for flow, and edge-case tests for resilience. I also automate quality gates in CI so failures are caught before release. In interviews, I share a case where this reduced production defects after feature rollout. The impact is higher release confidence and faster recovery when issues appear. The trade-off is test maintenance effort, which I reduce with stable test boundaries and clear ownership.`,
    },
    {
      question: `Describe a real-world challenge involving ${topicText} and how you would solve it.`,
      answer:
        `I start by defining the real constraint around ${topicText}, then break execution into clear milestones with risk checks. I explain implementation details only after aligning on measurable success criteria. In interviews, I mention rollback and observability plans because they show production maturity. The impact is lower delivery risk and better stakeholder confidence during rollout. The trade-off is slightly slower initial launch, mitigated by phased release and fast feedback loops.`,
    },
    {
      question: `How would you explain ${topicText} to a junior engineer on your team?`,
      answer:
        `I explain ${topicText} with a simple mental model first, then connect it to one practical code-level example. After that, I ask the junior engineer to apply it in a small guided task to verify understanding. In interviews, I position this as multiplying team productivity, not just sharing knowledge. The impact is faster onboarding and fewer repeated mistakes in delivery. The trade-off is mentoring time, which I offset by creating reusable examples and concise internal guides.`,
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
        "I answer by starting with the core principle, then mapping it to a concrete implementation scenario. Next, I highlight one measurable business or user impact to show outcome ownership. I close with one trade-off and the mitigation strategy so the answer sounds balanced and senior. This approach consistently creates a strong interviewer impression because it is clear, practical, and impact-oriented.",
    });
  }

  return fallback.slice(0, count);
}

function buildDetailedExplanationFallback(question, answer = "", providerMessage = "") {
  const questionText = String(question || "Interview question").trim();
  const answerText = String(answer || "").trim();

  const sampleAnswer = answerText
    ? answerText
    : "Start with a direct definition, explain your decision process, provide one concrete example, and close with trade-offs plus measurable impact.";

  return {
    title: questionText,
    explanation: [
      `## What The Interviewer Is Testing\n- Depth of understanding, not memorized definitions.\n- Ability to reason through real-world decisions.\n- Communication clarity under pressure.`,
      `## Core Concept Breakdown\n- Define the concept in one sentence.\n- Explain how it behaves in production scenarios.\n- Connect it to reliability, scalability, and maintainability outcomes.`,
      `## How To Structure Your Answer\n1. Start with a direct answer in one line.\n2. Walk through your approach step by step.\n3. Add one practical example from a project.\n4. Quantify impact (performance, reliability, or delivery speed).\n5. Close with one trade-off and mitigation.`,
      `## Interview-Ready Sample Answer\n${sampleAnswer}`,
      `## Common Mistakes To Avoid\n- Giving only theory with no practical example.\n- Skipping trade-offs and edge cases.\n- Using vague claims without measurable impact.`,
      `## Strong Follow-up Questions To Prepare\n- What alternative approach would you choose and why?\n- How would this design behave at 10x scale?\n- How would you test and monitor this in production?`,
      providerMessage
        ? `## AI Service Note\nThe AI provider is temporarily unavailable: ${providerMessage}\nUse the structure above to practice confidently, then retry Learn More for a richer explanation.`
        : `## Final Tip\nPractice your answer out loud in 60-90 seconds. Strong answers are clear, structured, and impact-focused.`,
    ],
  };
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

function hasUsableApiKey() {
  const key = String(process.env.OPENAI_API_KEY || "").trim();
  if (!key) return false;

  const normalized = key.toLowerCase();
  const knownPlaceholders = new Set([
    "openai_api_key",
    "your_openai_api_key",
    "sk-your_openai_api_key",
    "replace_with_openai_key",
  ]);

  if (knownPlaceholders.has(normalized)) return false;
  if (normalized.includes("your_openai")) return false;
  if (normalized.includes("replace") && normalized.includes("key")) return false;

  return true;
}

// @desc Generate interview questions and answers
const generateInterviewQuestions = async (req, res) => {
  try {
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

    if (!hasUsableApiKey()) {
      console.warn("OPENAI_API_KEY missing/invalid. Returning local fallback questions.");
      const fallbackQuestions = buildFallbackQuestions(role, topicToFocus, numberOfQuestions);
      setCachedQuestions(cacheKey, fallbackQuestions);
      return res.status(200).json(fallbackQuestions);
    }

    const prompt = buildInterviewReadyQuestionPrompt(
      role,
      experience,
      topicToFocus,
      numberOfQuestions
    );
    // Allow enough output budget for detailed interview-ready answers.
    const maxTokens = Math.min(4200, Math.max(900, numberOfQuestions * 320));

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
      const providerMessage = getProviderErrorMessage(err) || "AI service temporarily unavailable";
      console.error("AI provider error while generating questions:", providerMessage);
      const fallbackQuestions = buildFallbackQuestions(role, topicToFocus, numberOfQuestions);
      setCachedQuestions(cacheKey, fallbackQuestions);
      return res.status(200).json(fallbackQuestions);
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
    const { question, answer } = req.body;
    if (!question) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!hasUsableApiKey()) {
      return res.status(200).json(buildDetailedExplanationFallback(question, answer));
    }

    const prompt = buildDetailedConceptPrompt(question, answer);

    let response;
    try {
      response = await callWithRetry(() =>
        ai.chat.completions.create({
          model: EXPLAIN_MODEL,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1100,
          temperature: 0.3,
          response_format: { type: "json_object" },
        })
      );
    } catch (err) {
      const providerMessage = getProviderErrorMessage(err) || "AI explanation service unavailable";
      console.error("AI provider error while generating explanation:", providerMessage);
      return res.status(200).json(buildDetailedExplanationFallback(question, answer, providerMessage));
    }

    const rawText = extractOpenAIText(response);

    const cleanedText = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let data;
    try {
      data = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.warn("Falling back to local structured explanation (invalid JSON)");
      data = buildDetailedExplanationFallback(question, answer);
      if (rawText && rawText.length > 0) {
        data.explanation.unshift(`## Expanded Explanation\n${rawText}`);
      }
    }

    data.title = String(data.title || question).trim();
    if (data.explanation) {
      if (Array.isArray(data.explanation)) {
        data.explanation = data.explanation.map((item) => String(item || "").trim()).filter(Boolean);
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
      data.explanation = buildDetailedExplanationFallback(question, answer).explanation;
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in generateConceptExplanation:", error);
    return res
      .status(200)
      .json(
        buildDetailedExplanationFallback(
          req.body?.question,
          req.body?.answer,
          error.message || "Unexpected server error"
        )
      );
  }
};

module.exports = { generateInterviewQuestions, generateConceptExplanation };
