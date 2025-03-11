import React, { memo } from 'react';
import { FaPlay, FaCheck } from 'react-icons/fa';
import PropTypes from 'prop-types';

const EditorToolbar = memo(({ 
  onRun, 
  onCheck = () => {}, 
  isLoading, 
  language, 
  onLanguageChange, 
  languages,
  isCorrect,
  isRunning = false
}) => (
  <div className="editor-header">
    <div className="editor-buttons">
      <button 
        className="run-button" 
        onClick={onRun} 
        disabled={isLoading}
        aria-label={isLoading ? "Running code" : "Run code"}
      >
        <FaPlay aria-hidden="true" /> {isLoading ? 'Running...' : 'Run'}
      </button>
      <button 
        className={`check-button ${isCorrect !== null ? (isCorrect ? 'correct' : 'incorrect') : ''}`}
        onClick={onCheck}
        aria-label="Check answer"
      >
        <FaCheck aria-hidden="true" /> Check Answer
      </button>
    </div>
    <div className="language-select-container">
      <label htmlFor="language-select" className="visually-hidden">
      <select 
      id="language-select"
      value={language} 
      onChange={onLanguageChange} 
      className="languages-select"
      aria-label="Select programming language"
    >
      {languages.map((lang) => (
        <option key={lang.id} value={lang.id}>{lang.name}</option>
      ))}
    </select>
      </label>
     
    </div>
  </div>
));

EditorToolbar.propTypes = {
  onRun: PropTypes.func.isRequired,
  onCheck: PropTypes.func,
  isLoading: PropTypes.bool.isRequired,
  language: PropTypes.string.isRequired,
  onLanguageChange: PropTypes.func.isRequired,
  languages: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  })).isRequired,
  isCorrect: PropTypes.bool,
  isRunning: PropTypes.bool
};

EditorToolbar.displayName = 'EditorToolbar';
export default EditorToolbar; 