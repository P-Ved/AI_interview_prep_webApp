import React from "react";
import "./DeveloperCard.css";

const DeveloperCard = ({
  role = "Frontend Developer",
  technologies = "React.js, DOM manipulation, CSS Flexbox",
  experience = "2 Years",
  questions = "10 Q&A",
  lastUpdated = "Last Updated 30th Apr 2023",
  description = "Preparing for product-based company interviews",
  bgColor = "#ffffff",
  onCardClick = () => console.log("Card clicked"),
  onAddClick = () => console.log("Add clicked"),
  className = ""
}) => {
  // Get role abbreviation for badge
  const getRoleAbbreviation = (role) => {
    const abbreviations = {
      "Frontend Developer": "FD",
      "Backend Developer": "BD", 
      "Full Stack Developer": "FS",
      "Data Analyst": "DA",
      "DevOps Engineer": "DE",
      "UI/UX Designer": "UD",
      "Mobile App Developer": "MA",
      "AI/ML Engineer": "AE",
      "Product Manager": "PM"
    };
    return abbreviations[role] || role.split(" ").map(word => word[0]).join("").toUpperCase().substring(0, 2);
  };

  // Get badge color based on role
  const getBadgeColor = (role) => {
    const colors = {
      "Frontend Developer": "#10b981",
      "Backend Developer": "#f59e0b", 
      "Full Stack Developer": "#3b82f6",
      "Data Analyst": "#ef4444",
      "DevOps Engineer": "#8b5cf6",
      "UI/UX Designer": "#ec4899",
      "Mobile App Developer": "#06b6d4",
      "AI/ML Engineer": "#84cc16",
      "Product Manager": "#f97316"
    };
    return colors[role] || "#6b7280";
  };

  return (
    <div 
      className={`developer-card ${className}`}
      style={{ backgroundColor: bgColor }}
      onClick={onCardClick}
    >
      {/* Header Section */}
      <div className="developer-card__header">
        <div 
          className="developer-card__badge"
          style={{ backgroundColor: getBadgeColor(role) }}
        >
          {getRoleAbbreviation(role)}
        </div>
        <div className="developer-card__role-info">
          <h3 className="developer-card__role">{role}</h3>
          <p className="developer-card__technologies">{technologies}</p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="developer-card__stats">
        <span className="developer-card__stat-badge">Experience {experience}</span>
        <span className="developer-card__stat-badge">{questions}</span>
        <span className="developer-card__stat-badge">{lastUpdated}</span>
      </div>

      {/* Description */}
      <div className="developer-card__description">
        <p>{description}</p>
      </div>

      {/* Add Button */}
      <div className="developer-card__footer">
        <button 
          className="developer-card__add-btn"
          onClick={(e) => {
            e.stopPropagation();
            onAddClick();
          }}
        >
          <span className="add-icon">+</span>
          Add Now
        </button>
      </div>
    </div>
  );
};

export default DeveloperCard;