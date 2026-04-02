import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Input from "../../components/Inputs/Input";
import "./CreateSessionForm.css";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const TARGET_QUESTION_COUNT = 10;

const CreateSessionForm = ({ onClose, onSessionCreated }) => {
    const [formData, setFormData] = useState({
        role: "",
        experience: "",
        topicToFocus: "",
        description: "",
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loadingStep, setLoadingStep] = useState("");

    const buildFallbackQuestions = (
        role,
        topicToFocus,
        count = TARGET_QUESTION_COUNT,
        existingQuestions = []
    ) => {
        const roleText = role || "this role";
        const topicText = topicToFocus || "this topic";
        const existing = new Set(
            existingQuestions
                .map((item) => String(item?.question || "").trim().toLowerCase())
                .filter(Boolean)
        );

        const templates = [
            {
                question: `What are the core fundamentals you must know for ${roleText}?`,
                answer: `Start with the basics of ${topicText}, explain one concept clearly, and give one real-world example.`,
            },
            {
                question: `How would you solve a practical ${topicText} problem in an interview?`,
                answer: "Clarify requirements first, break the problem into steps, and explain trade-offs in your chosen approach.",
            },
            {
                question: `What common mistakes should be avoided in ${topicText}?`,
                answer: "Highlight frequent pitfalls, explain their impact, and share quick ways to prevent them.",
            },
            {
                question: `How do you debug issues related to ${topicText}?`,
                answer: "Reproduce the issue, inspect logs and behavior, isolate root cause, and validate the fix.",
            },
            {
                question: `How do you optimize performance when working with ${topicText}?`,
                answer: "Measure bottlenecks first, apply focused optimizations, and confirm improvement with tests or metrics.",
            },
            {
                question: `What security practices matter most for ${topicText}?`,
                answer: "Cover input validation, access controls, and safe handling of sensitive data and secrets.",
            },
            {
                question: `How would you test a ${topicText}-based solution?`,
                answer: "Use a mix of unit and integration tests, include edge cases, and automate checks in CI.",
            },
            {
                question: `When would you choose one approach over another in ${topicText}?`,
                answer: "Compare alternatives by complexity, scalability, maintainability, and team needs before deciding.",
            },
            {
                question: `Describe a real-world challenge in ${topicText} and your solution.`,
                answer: "State the problem, describe your steps, then explain the outcome and key lessons.",
            },
            {
                question: `How do you explain ${topicText} to a junior developer?`,
                answer: "Use simple language, one concrete example, and a clear mental model to build intuition.",
            },
        ];

        const fallback = [];

        for (const template of templates) {
            const key = template.question.trim().toLowerCase();
            if (existing.has(key)) continue;
            existing.add(key);
            fallback.push(template);
            if (fallback.length >= count) break;
        }

        while (fallback.length < count) {
            const index = fallback.length + 1;
            const question = `What interview strategy #${index} would you use for ${topicText}?`;
            const key = question.toLowerCase();
            if (existing.has(key)) continue;
            existing.add(key);
            fallback.push({
                question,
                answer:
                    "Start with a definition, give one practical example, and mention one trade-off to show depth.",
            });
        }

        return fallback.slice(0, count);
    };

    const handleChange = (key, value) => {
        setFormData((prevData) => ({
            ...prevData,
            [key]: value,
        }));
    };

    const handleCreateSession = async (e) => {
        e.preventDefault();

        const { role, experience, topicToFocus } = formData;

        if (!role.trim() || !experience.trim() || !topicToFocus.trim()) {
            setError("Please fill all the required fields.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const loadingToast = toast.loading("Creating your interview session...");

            const requestData = {
                role: formData.role.trim(),
                experience: formData.experience.trim(),
                topicToFocus: formData.topicToFocus.trim(),
                numberOfQuestions: TARGET_QUESTION_COUNT,
            };

            console.log("Creating session with data:", requestData);

            setLoadingStep(`Generating ${TARGET_QUESTION_COUNT} AI questions...`);
            toast.loading(`Generating ${TARGET_QUESTION_COUNT} interview questions...`, { id: loadingToast });
            let generatedQuestions = [];

            try {
                const aiResponse = await axiosInstance.post(
                    API_PATHS.AI.GENERATE_QUESTIONS,
                    requestData,
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        timeout: 30000,
                    }
                );

                generatedQuestions = Array.isArray(aiResponse.data)
                    ? aiResponse.data
                          .filter((item) => item?.question && item?.answer)
                          .map((item) => ({
                              question: String(item.question).trim(),
                              answer: String(item.answer).trim(),
                          }))
                    : [];
                if (generatedQuestions.length < TARGET_QUESTION_COUNT) {
                    const missing = TARGET_QUESTION_COUNT - generatedQuestions.length;
                    const fillers = buildFallbackQuestions(
                        requestData.role,
                        requestData.topicToFocus,
                        missing,
                        generatedQuestions
                    );
                    generatedQuestions = [...generatedQuestions, ...fillers];
                } else {
                    generatedQuestions = generatedQuestions.slice(0, TARGET_QUESTION_COUNT);
                }

                console.log(`Generated ${generatedQuestions.length} questions`);
            } catch (aiError) {
                if (aiError?.response?.status === 429) {
                    const retryAfter = aiError.retryAfter || aiError.response?.data?.retryAfter || 60;
                    toast.error(
                        `AI is rate limited right now. Creating session with starter questions. Try full AI generation after ${retryAfter}s.`,
                        { id: loadingToast, duration: 6000 }
                    );
                    generatedQuestions = buildFallbackQuestions(
                        requestData.role,
                        requestData.topicToFocus,
                        TARGET_QUESTION_COUNT
                    );
                } else if (aiError?.code === "ECONNABORTED") {
                    toast.error("AI took too long to respond. Creating session with starter questions.", {
                        id: loadingToast,
                        duration: 5000,
                    });
                    generatedQuestions = buildFallbackQuestions(
                        requestData.role,
                        requestData.topicToFocus,
                        TARGET_QUESTION_COUNT
                    );
                } else {
                    throw aiError;
                }
            }

            setLoadingStep("Saving session to database...");
            toast.loading("Creating session...", { id: loadingToast });
            const response = await axiosInstance.post(API_PATHS.SESSION.CREATE, {
                ...formData,
                questions: generatedQuestions,
            });

            console.log("Session creation response:", response.data);

            if (response.data?.success && response.data?.data) {
                const newSession = response.data.data;

                console.log("New session created:", newSession);

                setLoadingStep("Session created successfully!");
                toast.success(`"${newSession.role}" session created successfully!`, {
                    id: loadingToast,
                    duration: 4000,
                });

                if (typeof onSessionCreated === "function") {
                    onSessionCreated(newSession);
                    console.log("Dashboard updated with new session");
                }

                setTimeout(() => {
                    if (typeof onClose === "function") {
                        onClose();
                    }
                }, 1500);
            } else {
                throw new Error("Invalid response format from server");
            }
        } catch (error) {
            console.error("Session creation error:", error);
            console.error("Response data:", error.response?.data);

            let errorMessage = "Failed to create session. Please try again.";

            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.status === 429) {
                const retryAfter =
                    error.retryAfter ||
                    error.response?.data?.retryAfter ||
                    error.response?.headers?.["retry-after"];
                errorMessage = `Service is rate limited. Please retry after ${retryAfter || "a few"} seconds.`;
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.code === "ECONNABORTED") {
                errorMessage = "Request timed out. Please try again.";
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast.error(errorMessage, { duration: 6000 });
            setError(errorMessage);
        } finally {
            setIsLoading(false);
            setLoadingStep("");
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="create-session-overlay" onClick={handleOverlayClick}>
            <div className="create-session-modal">
                <div className="create-session-header">
                    <div className="header-content">
                        <h2 className="modal-title">Create New Session</h2>
                        <p className="modal-subtitle">Set up your interview preparation session</p>
                    </div>
                    <button onClick={onClose} className="close-button" aria-label="Close modal">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleCreateSession} className="create-session-form">
                    <div className="form-fields">
                        <Input
                            label="Role / Position"
                            value={formData.role}
                            onChange={(value) => handleChange("role", value)}
                            placeholder="e.g., Frontend Developer, Full Stack Engineer"
                            required
                        />

                        <Input
                            label="Experience Level"
                            value={formData.experience}
                            onChange={(value) => handleChange("experience", value)}
                            placeholder="e.g., 2-3 years, Senior level, Entry level"
                            required
                        />

                        <Input
                            label="Topic to Focus"
                            value={formData.topicToFocus}
                            onChange={(value) => handleChange("topicToFocus", value)}
                            placeholder="e.g., React, JavaScript, CSS, System Design"
                            required
                        />

                        <div className="form-group">
                            <label className="form-label">
                                Description
                                <span className="optional-text">(Optional)</span>
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleChange("description", e.target.value)}
                                placeholder="Additional details about your interview preparation goals..."
                                className="form-textarea"
                                rows={4}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="error-message">
                            <span className="error-text">{error}</span>
                        </div>
                    )}

                    {isLoading && loadingStep && (
                        <div className="loading-progress">
                            <div className="loading-progress-inner">
                                <Loader2 size={16} className="spinner" />
                                {loadingStep}
                            </div>
                        </div>
                    )}

                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            className="create-btn-secondary"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading} className="create-btn-primary">
                            {isLoading ? (
                                <>
                                    <Loader2 size={16} className="spinner" />
                                    Creating Session...
                                </>
                            ) : (
                                "Create Session"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateSessionForm;
