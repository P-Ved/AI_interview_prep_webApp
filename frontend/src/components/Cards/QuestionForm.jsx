import React, { useState } from "react";
import "./QuestionForm.css";

const QuestionForm = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    role: '',
    experience: '',
    topicToFocus: '',
    numberOfQuestions: 10
  });

  const handleSubmit = () => {
    if (formData.role && formData.experience && formData.topicToFocus) {
      onSubmit(formData);
    } else {
      alert('Please fill in all required fields');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'numberOfQuestions' ? parseInt(value, 10) || 10 : value
    }));
  };

  return (
    <div className="question-form">
      <h2 className="form-title">
        ✨ Generate Interview Questions
      </h2>
      
      <div className="form-content">
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">
              👤 Role
            </label>
            <input
              type="text"
              name="role"
              value={formData.role}
              onChange={handleChange}
              placeholder="e.g., Backend Developer"
              className="form-input"
              required
            />
          </div>
          
          <div className="form-field">
            <label className="form-label">
              💼 Experience
            </label>
            <input
              type="text"
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              placeholder="e.g., 2 years"
              className="form-input"
              required
            />
          </div>
        </div>
        
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">
              📚 Topic to Focus
            </label>
            <input
              type="text"
              name="topicToFocus"
              value={formData.topicToFocus}
              onChange={handleChange}
              placeholder="e.g., Node.js"
              className="form-input"
              required
            />
          </div>
          
          <div className="form-field">
            <label className="form-label">
              🔢 Number of Questions
            </label>
            <select
              name="numberOfQuestions"
              value={formData.numberOfQuestions}
              onChange={handleChange}
              className="form-select"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
        </div>
        
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className={`submit-button ${isLoading ? 'loading' : ''}`}
        >
          {isLoading ? (
            <>
              🔄 Generating Questions...
            </>
          ) : (
            <>
              🚀 Generate Questions
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default QuestionForm;
