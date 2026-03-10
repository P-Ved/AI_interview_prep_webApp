import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import moment from "moment";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import RoleInfoHeader from "./components/RoleInfoHeader";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { AnimatePresence, motion } from "framer-motion";
import QuestionCard from "../../components/Cards/QuestionCard";
import AIResponsePreview from "./components/AIResponsePreview";
import "./InterviewPrep.css";

const InterviewPrep = () => {
  const { sessionId } = useParams();
  const [sessionData, setSessionData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [openLeanMoreDrawer, setOpenLeanMoreDrawer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [questions, setQuestions] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainContent, setExplainContent] = useState("");
  const [explainError, setExplainError] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [drawerWidth, setDrawerWidth] = useState(520);
  const [learnMoreLoading, setLearnMoreLoading] = useState(false);
  const [explainCache, setExplainCache] = useState({});

  const getShortAnswer = (text) => {
    if (!text) return "";
    // Remove code fences/markdown and extra whitespace
    let clean = String(text)
      .replace(/```[\s\S]*?```/g, " ") // remove fenced code blocks
      .replace(/`([^`]+)`/g, "$1") // inline code
      .replace(/\*\*/g, "") // bold
      .replace(/\*/g, "") // bullets/emphasis
      .replace(/\s+/g, " ")
      .trim();

    // Split into sentences and keep first 2
    const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
    let short = sentences.slice(0, 2).join(" ");

    // Limit to ~180 chars
    if (short.length > 180) {
      const cut = short.lastIndexOf(" ", 175);
      short = short.slice(0, cut > 140 ? cut : 180) + "...";
    }

    return short;
  };

  const buildFallbackExplanation = (questionText, answerText, retryAfter = null, providerMsg = "") => {
    const retryMsg = retryAfter ? `Please retry after ${retryAfter} seconds.` : "Please retry in a short while.";
    const short = getShortAnswer(answerText || "");
    return `### AI explanation is temporarily unavailable

The provider returned a quota/rate-limit response for **Learn More**.
${providerMsg ? `\nProvider message: ${providerMsg}\n` : ""}

- ${retryMsg}
- You can continue practice using this quick explanation below.

### Quick explanation
${short || "Review the core concept, explain the idea in your own words, then describe one practical example and one trade-off."}

### How to answer in interview
- Start with a 1-line definition.
- Explain why it matters.
- Give one concrete example.
- Mention one limitation or trade-off.`;
  };

  const generateConceptExplanation = async (questionText, answerText = "") => {
    if (learnMoreLoading) return;
    try {
      setExplainError("");
      setSelectedQuestion(questionText || "");
      setSelectedAnswer(answerText || "");
      setExplainOpen(true);
      setExplainLoading(true);

      const cacheKey = String(questionText || "").trim().toLowerCase();
      if (cacheKey && explainCache[cacheKey]) {
        setExplainContent(explainCache[cacheKey]);
        setExplainLoading(false);
        return;
      }

      setLearnMoreLoading(true);
      const res = await axiosInstance.post(API_PATHS.AI.GENERATE_EXPLANATION, { question: questionText });
      const data = res.data || {};
      const paragraphs = Array.isArray(data.explanation) ? data.explanation : [data.explanation || answerText || selectedAnswer];
      // Only the explanation body; title/question shown separately in the panel header
      const md = `${paragraphs.filter(Boolean).join("\n\n")}`;
      setExplainContent(md);
      if (cacheKey) {
        setExplainCache((prev) => ({ ...prev, [cacheKey]: md }));
      }
    } catch (e) {
      const status = e?.response?.status;
      const retryAfter = e?.retryAfter || e?.response?.data?.retryAfter || e?.response?.headers?.["retry-after"] || null;
      const providerMsg = e?.response?.data?.message || "";
      if (status === 429 || e?.code === "ECONNABORTED") {
        setExplainError("");
        const fallback = buildFallbackExplanation(questionText, answerText, retryAfter, providerMsg);
        setExplainContent(fallback);
      } else {
        setExplainError(e.response?.data?.message || "Failed to load explanation");
      }
    } finally {
      setExplainLoading(false);
      setLearnMoreLoading(false);
    }
  };

  const toggleQuestionPinStatus = async (questionId) => {
    try {
      console.log("Toggling pin status for:", questionId);
      // Optimistic update
      setSessionData((prevData) => ({
        ...prevData,
        questions: prevData?.questions?.map((q) =>
          q._id === questionId ? { ...q, isPinned: !q.isPinned } : q
        ),
      }));
      // Persist only if it's a real DB id (not generated client-side)
      if (questionId && !String(questionId).startsWith('gen-')) {
        await axiosInstance.post(API_PATHS.QUESTION.PIN(questionId));
      }
    } catch (e) {
      console.error('Failed to toggle pin', e);
    }
  };

  const fetchSessionDetailsById = async () => {
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      const response = await axiosInstance.get(
        API_PATHS.SESSION.GET_ONE(sessionId)
      );

      console.log("✅ Full API Response:", response);
      console.log("✅ Response Data:", response.data);
      console.log("✅ Session Data:", response.data?.data);
      console.log("✅ Questions Array:", response.data?.data?.questions);
      
      // Log each question individually and validate quality
      if (response.data?.data?.questions) {
        const questions = response.data.data.questions;
        const qualityIssues = [];
        
        questions.forEach((q, index) => {
          console.log(`✅ Question ${index + 1}:`, q);
          console.log(`   - Question text:`, q.question);
          console.log(`   - Answer:`, q.answer);
          console.log(`   - ID:`, q._id);
          console.log(`   - isPinned:`, q.isPinned);
          
          // Check for quality issues
          if (!q.question || q.question.includes('Interview Question')) {
            qualityIssues.push(`Question ${index + 1}: Generic or missing question text`);
          }
          
          if (!q.answer) {
            qualityIssues.push(`Question ${index + 1}: Missing answer`);
          }
          
          // Check for duplicates within this session
          const duplicates = questions.filter(other => 
            other.question === q.question && other._id !== q._id
          );
          if (duplicates.length > 0) {
            qualityIssues.push(`Question ${index + 1}: Duplicate question found`);
          }
        });
        
        if (qualityIssues.length > 0) {
          console.warn('⚠️  Data quality issues detected:');
          qualityIssues.forEach(issue => console.warn(`   - ${issue}`));
        }
      }

      if (response.data?.success && response.data?.data) {
        setSessionData(response.data.data);
        const initialQs = Array.isArray(response.data.data.questions) ? response.data.data.questions : [];
        setQuestions(initialQs);
        setVisibleCount(10);
        
        // Additional validation
        const questionsCount = response.data.data.questions?.length || 0;
        console.log(`✅ Total questions found: ${questionsCount}`);
        
        if (questionsCount === 0) {
          console.warn("⚠️  No questions found in the session data");
        }
      } else {
        console.error("❌ Invalid response structure:", response.data);
        setErrorMsg("Invalid session data received");
      }
    } catch (error) {
      console.error("❌ Error fetching session:", error);
      console.error("❌ Error response:", error.response?.data);
      setErrorMsg(error.response?.data?.message || "Failed to load session");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetailsById();
    }
  }, [sessionId]);

  return (
    <DashboardLayout>
      <div className={`interview-prep-page ${explainOpen ? 'with-drawer' : ''}`}>
        {/* Error State */}
        {errorMsg && (
          <div className="interview-prep-error">
            <strong>⚠️ Error:</strong> {errorMsg}
          </div>
        )}
        
        {/* Loading State */}
        {isLoading && (
          <div className="interview-prep-loading">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading interview session...</div>
            <div className="loading-subtext">Session ID: {sessionId}</div>
          </div>
        )}
      
      
      {/* Main Content */}
      {!isLoading && !errorMsg && sessionData && (
        <>
          <RoleInfoHeader
            role={sessionData?.role || "Role Title"}
            topicsToFocus={
              sessionData?.topicToFocus ||
              sessionData?.technologies ||
              "Technologies..."
            }
            experience={sessionData?.experience || "-"}
            questions={sessionData?.questions?.length || "-"}
            description={sessionData?.description || ""}
            lastUpdated={
              sessionData?.updatedAt
                ? moment(sessionData.updatedAt).format("Do MMM YYYY")
                : "-"
            }
          />

          <div className="interview-content">
              <div className="questions-container" style={{ marginLeft: 'auto', marginRight: explainOpen ? drawerWidth + 20 : 'auto', transform: explainOpen ? 'translateX(-8px)' : 'none', transition: 'margin-right 0.3s ease, transform 0.3s ease' }}>
              
              <AnimatePresence>
                {/* Check if questions exist and is an array */}
                {Array.isArray(questions) && questions.length > 0 ? (
                  questions.slice(0, visibleCount).map((questionData, index) => {
                    // Log each question being rendered
                    console.log(`🎯 Rendering question ${index + 1}:`, questionData);
                    
                    // Extract question text with fallbacks
                    // Handle the case where question field is missing in existing data
                    let questionText = questionData.question || 
                                     questionData.questionText || 
                                     questionData.text ||
                                     questionData.title;
                    
                    // If no question text found, generate one from the answer
                    if (!questionText || questionText.trim() === '') {
                      // Try to extract the first part of the answer as question context
                      const answer = questionData.answer || '';
                      if (answer.includes('query data') || answer.includes('db.collection')) {
                        questionText = 'How do you query data in MongoDB?';
                      } else if (answer.toLowerCase().includes('react')) {
                        questionText = 'What is React and how does it work?';
                      } else if (answer.toLowerCase().includes('javascript')) {
                        questionText = 'What is JavaScript?';
                      } else if (answer.toLowerCase().includes('css')) {
                        questionText = 'What is CSS?';
                      } else {
                        // Generic fallback
                        questionText = `Interview Question ${index + 1}`;
                      }
                      
                      console.log(`🔧 Generated question text from answer: ${questionText}`);
                    }
                    
                    // Extract answer with fallbacks
                    const answerText = questionData.answer || 
                                     questionData.answerText ||
                                     questionData.response ||
                                     "";
                    
                    // Debug log to see what's actually in questionData
                    console.log(`🔍 Question ${index + 1} properties:`, Object.keys(questionData));
                    console.log(`🔍 Question text found:`, questionText);
                    console.log(`🔍 Answer found:`, answerText !== "No answer provided" ? "✅" : "❌");
                    
                    console.log(`   📝 Question: ${questionText}`);
                    console.log(`   💡 Answer: ${answerText}`);
                    
                    return (
                      <motion.div
                        key={questionData._id || `question-${index}`}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{
                          duration: 0.4,
                          type: "spring",
                          stiffness: 100,
                          damping: 15,
                          delay: index * 0.1,
                        }}
                        layout
                        layoutId={`question-${questionData._id || index}`}
                        style={{ marginBottom: "1rem" }}
                      >
                        <QuestionCard
                          questionNumber={index + 1}
                          questionText={questionText}
                          shortAnswer={getShortAnswer(answerText)}
                          onLearnMore={() => generateConceptExplanation(questionText, answerText)}
                          isLearnMoreLoading={learnMoreLoading}
                          isPinned={questionData.isPinned || false}
                          onTogglePin={() => toggleQuestionPinStatus(questionData._id)}
                        />
                      </motion.div>
                    );
                  })
                ) : sessionData?.answer ? (
                  // Fallback for direct answer in session (not in questions array)
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ marginBottom: "1rem" }}
                  >
                    <QuestionCard
                      questionNumber={1}
                      questionText={"AI Generated Interview Response"}
                      shortAnswer={getShortAnswer(sessionData.answer)}
                      onLearnMore={() => generateConceptExplanation("AI Generated Interview Response", sessionData.answer)}
                      isLearnMoreLoading={learnMoreLoading}
                      isPinned={sessionData.isPinned || false}
                      onTogglePin={() => toggleQuestionPinStatus(sessionData._id)}
                    />
                  </motion.div>
                ) : (
                  // No questions found state
                  <div className="no-questions-state">
                    <div className="no-questions-icon">📝</div>
                    <h3 className="no-questions-title">No Questions Available</h3>
                    <p className="no-questions-description">
                      This session doesn't contain any interview questions yet.
                    </p>
                    <p className="no-questions-session-id">
                      Session ID: {sessionId}
                    </p>
                  </div>
                )}
              </AnimatePresence>

              {/* Load More */}
              <div className="load-more-container">
                {Array.isArray(questions) && questions.length >= visibleCount && (
                  <button className="btn-load-more" onClick={async () => {
                    try {
                      setLoadingMore(true);
                      // Build a set of existing question texts to dedupe
                      const existing = new Set(questions.map(q => (q.question || q.questionText || q.text || "").trim().toLowerCase()));
                      const body = {
                        role: sessionData?.role,
                        experience: sessionData?.experience,
                        topicToFocus: sessionData?.topicToFocus || sessionData?.topicsToFocus || sessionData?.technologies,
                        numberOfQuestions: 10
                      };
                      const res = await axiosInstance.post(API_PATHS.AI.GENERATE_QUESTIONS, body);
                      const fresh = Array.isArray(res.data) ? res.data : [];
                      const uniqueFresh = fresh.filter(item => item?.question && !existing.has(item.question.trim().toLowerCase()));
                      const normalized = uniqueFresh.map((q, i) => ({ _id: `gen-${Date.now()}-${i}`, question: q.question, answer: q.answer }));
                      const nextQuestions = [...questions, ...normalized];
                      setQuestions(nextQuestions);
                      setVisibleCount(prev => prev + Math.min(10, uniqueFresh.length || 0));
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setLoadingMore(false);
                    }
                  }} disabled={loadingMore}>
                    {loadingMore ? "Loading..." : "Load More"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Learn More Drawer */}
          {explainOpen && (
            <div className="drawer-root">
              <div
                className="drawer"
                style={{ width: drawerWidth, maxWidth: '92vw' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="drawer-resizer"
                  onMouseDown={(e) => {
                    const startX = e.clientX;
                    const startWidth = drawerWidth;
                    const onMove = (ev) => {
                      const dx = startX - ev.clientX; // dragging left increases width
                      const next = Math.min(900, Math.max(360, startWidth + dx));
                      setDrawerWidth(next);
                    };
                    const onUp = () => {
                      window.removeEventListener('mousemove', onMove);
                      window.removeEventListener('mouseup', onUp);
                    };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  }}
                />

                <div className="drawer-header">
                  <h3>Learn More</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="drawer-size-btn" onClick={() => setDrawerWidth((w) => Math.min(900, w + 40))}>⟷</button>
                    <button className="drawer-size-btn" onClick={() => setDrawerWidth((w) => Math.max(360, w - 40))}>↔</button>
                    <button className="drawer-close" onClick={() => setExplainOpen(false)}>✖</button>
                  </div>
                </div>

                <div className="drawer-body">
                  <h4 className="drawer-question-title">{selectedQuestion}</h4>
                  <div className="drawer-divider" />
                  {explainLoading ? (
                    <div className="drawer-loading">Generating explanation...</div>
                  ) : explainError ? (
                    <div className="drawer-error">{explainError}</div>
                  ) : (
                    <AIResponsePreview content={explainContent} />
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </DashboardLayout>
  );
};

export default InterviewPrep;
