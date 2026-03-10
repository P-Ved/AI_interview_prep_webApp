import React from "react";
import { Trash2, Code, Calendar, HelpCircle } from "lucide-react";
import "./SummaryCard.css";

const SummaryCard = ({
  colors = { bgcolor: "#3B82F6", iconbg: "#10B981" },
  role = "Frontend Developer",
  topicsToFocus = "React, JavaScript, CSS",
  experience = 3,
  questions = 25,
  description = "Passionate about creating user-friendly interfaces and modern web applications with cutting-edge technologies.",
  lastUpdated = "2 days ago",
  onSelect = () => console.log("Card selected"),
  onDelete = () => console.log("Card deleted"),
}) => {
  return (
    <div className="summary-card" onClick={onSelect}>
      {/* Header with Role and Delete Button */}
      <div className="summary-card__header">
        <div className="summary-card__role-section">
          <div className="summary-card__role-icon">
            <Code size={20} />
          </div>
          <div className="summary-card__role-info">
            <h3 className="summary-card__role">{role}</h3>
            <p className="summary-card__topics">{topicsToFocus}</p>
          </div>
        </div>
        
        <button
          className="summary-card__delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete session"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Stats Section */}
      <div className="summary-card__stats">
        <div className="summary-card__stat">
          <div className="summary-card__stat-icon">
            <Calendar size={16} />
          </div>
          <div className="summary-card__stat-info">
            <span className="summary-card__stat-value">{experience}</span>
            <span className="summary-card__stat-label">Years Exp</span>
          </div>
        </div>
        
        <div className="summary-card__stat">
          <div className="summary-card__stat-icon">
            <HelpCircle size={16} />
          </div>
          <div className="summary-card__stat-info">
            <span className="summary-card__stat-value">{questions}</span>
            <span className="summary-card__stat-label">Questions</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="summary-card__description">
        <p>{description}</p>
      </div>

      {/* Footer */}
      <div className="summary-card__footer">
        <span className="summary-card__last-updated">Updated {lastUpdated}</span>
        <div className="summary-card__action-hint">Click to view →</div>
      </div>
    </div>
  );
};

export default SummaryCard;