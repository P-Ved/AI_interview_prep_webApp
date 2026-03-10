import React from 'react';
import { Code, Calendar, HelpCircle, Award } from 'lucide-react';
import './RoleInfoHeader.css';

const RoleInfoHeader = ({
  role,
  topicsToFocus,
  experience,
  questions,
  description,
  lastUpdated,
}) => {
  return (
    <div className="role-header">
      <div className="role-header-background">
        <div className="role-header-overlay"></div>
      </div>
      
      <div className="role-header-content">
        <div className="role-header-main">
          <div className="role-icon">
            <Code size={32} />
          </div>
          
          <div className="role-info">
            <h1 className="role-title">{role || "Interview Session"}</h1>
            <p className="role-topics">{topicsToFocus || "General Topics"}</p>
            {description && (
              <p className="role-description">{description}</p>
            )}
          </div>
        </div>

        <div className="role-stats">
          <div className="role-stat">
            <div className="role-stat-icon">
              <Award size={20} />
            </div>
            <div className="role-stat-info">
              <span className="role-stat-value">{experience || "0"}</span>
              <span className="role-stat-label">Years Experience</span>
            </div>
          </div>
          
          <div className="role-stat">
            <div className="role-stat-icon">
              <HelpCircle size={20} />
            </div>
            <div className="role-stat-info">
              <span className="role-stat-value">{questions || 0}</span>
              <span className="role-stat-label">Questions</span>
            </div>
          </div>
          
          <div className="role-stat">
            <div className="role-stat-icon">
              <Calendar size={20} />
            </div>
            <div className="role-stat-info">
              <span className="role-stat-value">{lastUpdated || "Today"}</span>
              <span className="role-stat-label">Last Updated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleInfoHeader;
