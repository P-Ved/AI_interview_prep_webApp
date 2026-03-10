import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Input from "../../components/Inputs/Input";
import "./CreateSessionForm.css";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const CreateSessionForm = ({ onClose, onSessionCreated }) => {
    const [formData, setFormData] = useState({
        role: "",
        experience: "",
        topicToFocus: "", // Changed from topicsToFocus to topicToFocus (singular)
        description: "",
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loadingStep, setLoadingStep] = useState('');

    const buildFallbackQuestions = (role, topicToFocus) => ([
        {
            question: `What are the core fundamentals you must know for ${role}?`,
            answer: `Start with the basics of ${topicToFocus}, explain one concept clearly, and show a simple real-world example.`,
        },
        {
            question: `How would you explain your approach to solving a ${topicToFocus} problem in an interview?`,
            answer: `Clarify requirements, break the problem into steps, discuss trade-offs, and provide a clean, testable solution.`,
        },
        {
            question: `What common mistakes should be avoided in ${topicToFocus}?`,
            answer: `Avoid memorized answers, focus on first principles, and explain why your chosen approach is better than alternatives.`,
        },
    ]);

    const handleChange = (key, value) => {
        setFormData((prevData) => ({
            ...prevData,
            [key]: value,
        }));
    };

    const handleCreateSession = async (e) => {
        e.preventDefault();

        const { role, experience, topicToFocus } = formData; // Changed from topicsToFocus to topicToFocus

        if (!role.trim() || !experience.trim() || !topicToFocus.trim()) { // Changed from topicsToFocus to topicToFocus
            setError("Please fill all the required fields.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Show loading toast
            const loadingToast = toast.loading('Creating your interview session...');
            
            // Now field names match exactly what works in Postman
            const requestData = {
                role: formData.role.trim(),
                experience: formData.experience.trim(),
                topicToFocus: formData.topicToFocus.trim(),
                numberOfQuestions: 5,
            };

            console.log("🚀 Creating session with data:", requestData);

            // Step 1: Generate AI questions (fallback if AI is rate limited)
            setLoadingStep('Generating 5 AI questions...');
            toast.loading('Generating 5 interview questions...', { id: loadingToast });
            let generatedQuestions = [];

            try {
                const aiResponse = await axiosInstance.post(
                    API_PATHS.AI.GENERATE_QUESTIONS,
                    requestData,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        timeout: 30000
                    }
                );

                generatedQuestions = Array.isArray(aiResponse.data) ? aiResponse.data : [];
                console.log(`✅ Generated ${generatedQuestions.length} questions`);
            } catch (aiError) {
                if (aiError?.response?.status === 429) {
                    const retryAfter = aiError.retryAfter || aiError.response?.data?.retryAfter || 60;
                    toast.error(`AI is rate limited right now. Creating session with starter questions. Try full AI generation after ${retryAfter}s.`, { id: loadingToast, duration: 6000 });
                    generatedQuestions = buildFallbackQuestions(requestData.role, requestData.topicToFocus);
                } else if (aiError?.code === "ECONNABORTED") {
                    toast.error("AI took too long to respond. Creating session with starter questions.", { id: loadingToast, duration: 5000 });
                    generatedQuestions = buildFallbackQuestions(requestData.role, requestData.topicToFocus);
                } else {
                    throw aiError;
                }
            }

            // Step 2: Create session with generated questions
            setLoadingStep('Saving session to database...');
            toast.loading('Creating session...', { id: loadingToast });
            const response = await axiosInstance.post(API_PATHS.SESSION.CREATE, {
                ...formData,
                questions: generatedQuestions,
            });

            console.log("🎉 Session creation response:", response.data);

            // Fix: Check for the correct response structure
            if (response.data?.success && response.data?.data) {
                const newSession = response.data.data;
                
                console.log("✅ New session created:", newSession);

                // Show success message
                setLoadingStep('Session created successfully!');
                toast.success(`"${newSession.role}" session created successfully!`, {
                    id: loadingToast,
                    duration: 4000
                });

                // Update dashboard immediately (this will make the new card appear)
                if (typeof onSessionCreated === "function") {
                    onSessionCreated(newSession);
                    console.log("🔄 Dashboard updated with new session");
                }

                // Close modal automatically after success
                setTimeout(() => {
                    if (typeof onClose === "function") {
                        onClose();
                    }
                }, 1500); // Close after 1.5 seconds to let user see success message

                // Don't navigate immediately - stay on dashboard to see the new card
                // User can click on the card if they want to view it
                
            } else {
                throw new Error('Invalid response format from server');
            }

        } catch (error) {
            console.error("❌ Session creation error:", error);
            console.error("❌ Response data:", error.response?.data);

            let errorMessage = "Failed to create session. Please try again.";
            
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.status === 429) {
                const retryAfter = error.retryAfter || error.response?.data?.retryAfter || error.response?.headers?.['retry-after'];
                errorMessage = `Service is rate limited. Please retry after ${retryAfter || 'a few'} seconds.`;
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.code === "ECONNABORTED") {
                errorMessage = "Request timed out. Please try again.";
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            // Show error toast
            toast.error(errorMessage, { duration: 6000 });
            setError(errorMessage);
            
        } finally {
            setIsLoading(false);
            setLoadingStep('');
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
                        <p className="modal-subtitle">
                            Set up your interview preparation session
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="close-button"
                        aria-label="Close modal"
                    >
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
                            value={formData.topicToFocus} // Changed from topicsToFocus to topicToFocus
                            onChange={(value) => handleChange("topicToFocus", value)} // Changed from topicsToFocus to topicToFocus
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
