import React, { useState, useRef, useEffect } from "react";
import "./QuestionCard.css";

const QuestionCard = ({
  questionNumber,
  questionText,
  shortAnswer,
  onLearnMore,
  isLearnMoreLoading = false,
  isPinned,
  onTogglePin,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [height, setHeight] = useState(0);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isExpanded && contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(contentHeight + 10);
    } else {
      setHeight(0);
    }
  }, [isExpanded]);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const handleLearnMore = () => {
    setIsExpanded(true);
    if (onLearnMore) onLearnMore();
  };

  return (
    <div className="question-card">
      <div className="question-header">
        <div className="question-content">
          <div className="question-icon">
            <span>{questionNumber}</span>
          </div>
          <h3 className="question-title">
            {questionText || "Question text not available"}
          </h3>
        </div>

        <div className="card-actions">
          <div className="action-buttons">
            <button
              className="learn-more-button"
              onClick={handleLearnMore}
              title="Learn More"
              disabled={isLearnMoreLoading}
            >
              {isLearnMoreLoading ? "⏳ Loading..." : "✨ Learn More"}
            </button>
          </div>

          <button className="expand-button" onClick={toggleExpand}>
            <span className="expand-label">{isExpanded ? "Hide" : "👁 See Answer"}</span>
          </button>
        </div>
      </div>

      <div className="answer-container" style={{ maxHeight: `${height}px` }}>
        <div ref={contentRef} className="answer-content">
          {isExpanded && shortAnswer && (
            <div className="answer-section">
              <h4 className="answer-question-text">Interview-ready answer:</h4>
              <p className="answer-text">{shortAnswer}</p>
            </div>
          )}
          {isExpanded && !shortAnswer && (
            <div className="answer-section">
              <h4 className="answer-question-text">Interview-ready answer:</h4>
              <p className="answer-text">Answer not available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
