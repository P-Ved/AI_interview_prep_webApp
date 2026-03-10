import React, { useState } from "react";
import QuestionCard from "./QuestionCard";
import QuestionForm from "./QuestionForm";
import "./App.css";

const App = () => {
  const [questions, setQuestions] = useState([]);
  const [pinnedQuestions, setPinnedQuestions] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateQuestions = async (formData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Sending request to backend:', formData);
      
      const response = await fetch('http://localhost:8000/api/ai/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received data:', data);
      
      setQuestions(data);
      setPinnedQuestions(new Set());
    } catch (err) {
      console.error('Error generating questions:', err);
      setError(err.message || 'Failed to generate questions');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePin = (index) => {
    setPinnedQuestions(prev => {
      const newPinned = new Set(prev);
      if (newPinned.has(index)) {
        newPinned.delete(index);
      } else {
        newPinned.add(index);
      }
      return newPinned;
    });
  };

  const handleLearnMore = (index) => {
    console.log(`Learn more clicked for question ${index + 1}`);
  };

  return (
    <div className="app-container">
      <h1 className="app-title">
        AI Interview Question Generator
      </h1>
      
      <QuestionForm onSubmit={generateQuestions} isLoading={isLoading} />
      
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
          <div className="error-details">
            Make sure your backend is running on http://localhost:8000
          </div>
        </div>
      )}
      
      {questions.length > 0 && (
        <div className="questions-section">
          <h2 className="questions-title">
            Generated Questions ({questions.length})
          </h2>
          <div className="questions-container">
            {questions.map((item, index) => (
              <QuestionCard
                key={index}
                questionNumber={index + 1}
                questionText={item.question}
                answer={item.answer}
                isPinned={pinnedQuestions.has(index)}
                onTogglePin={() => togglePin(index)}
                onLearnMore={() => handleLearnMore(index)}
              />
            ))}
          </div>
        </div>
      )}
      
      {questions.length === 0 && !isLoading && !error && (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h3 className="empty-state-title">No questions yet</h3>
          <p className="empty-state-description">
            Fill out the form above to generate interview questions
          </p>
        </div>
      )}
    </div>
  );
};

export default App;