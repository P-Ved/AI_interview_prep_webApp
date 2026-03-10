import React from "react";
import "./Input.css";

const Input = ({ label, value, onChange, placeholder, required, type = "text" }) => {
  return (
    <div className="input-container">
      <label className="input-label">
        {label}
        {required && <span className="required-asterisk">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="input-field"
      />
    </div>
  );
};

export default Input;
