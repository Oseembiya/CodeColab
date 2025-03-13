import React, { memo } from 'react';
import { 
  FaPlay, 
  FaCheck, 
  FaMagic, 
  FaSearchPlus, 
  FaSearchMinus,
  FaUndo,
  FaRedo,
  FaCopy,
  FaDownload,
  FaUpload
} from 'react-icons/fa';
import PropTypes from 'prop-types';
import { getSupportedLanguages } from '../../services/codeExecution';

const EditorToolbar = memo(({ 
  onRun, 
  onCheck,
  onFormat,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  onCopy,
  onDownload,
  onUpload,
  isLoading, 
  language, 
  onLanguageChange, 
  fontSize,
  onFontSizeChange
}) => {
  const languages = getSupportedLanguages();

  return (
    <div className="editor-header">
      <div className="editor-buttons">
        <button 
          className="run-button" 
          onClick={onRun} 
          disabled={isLoading}
          title="Run code (Ctrl+Enter)"
        >
          <FaPlay /> {isLoading ? 'Running...' : 'Run'}
        </button>

        <div className="button-group">
          <button 
            onClick={onFormat} 
            className="format-button"
            title="Format code (Alt+Shift+F)"
          >
            <FaMagic /> Format
          </button>
          <button onClick={onUndo} title="Undo (Ctrl+Z)">
            <FaUndo />
          </button>
          <button onClick={onRedo} title="Redo (Ctrl+Y)">
            <FaRedo />
          </button>
        </div>

        <div className="button-group">
          <button onClick={onZoomIn} title="Zoom in (Ctrl++)">
            <FaSearchPlus />
          </button>
          <button onClick={onZoomOut} title="Zoom out (Ctrl--)">
            <FaSearchMinus />
          </button>
          <select 
            value={fontSize} 
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            className="font-size-select"
            title="Font size"
          >
            {[12, 14, 16, 18, 20, 22, 24].map(size => (
              <option key={size} value={size}>{size}px</option>
            ))}
          </select>
        </div>

        <div className="button-group">
          <button onClick={onCopy} title="Copy code">
            <FaCopy />
          </button>
          <button onClick={onDownload} title="Download code">
            <FaDownload />
          </button>
          <label className="upload-button" title="Upload code">
            <FaUpload />
            <input 
              type="file" 
              onChange={onUpload} 
              accept=".js,.py,.java,.cpp,.cs"
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <div className="language-select-container">
        <select 
          value={language} 
          onChange={(e) => onLanguageChange(e.target.value)} 
          className="languages-select"
        >
          {languages.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
});

EditorToolbar.propTypes = {
  onRun: PropTypes.func.isRequired,
  onCheck: PropTypes.func,
  onFormat: PropTypes.func.isRequired,
  onZoomIn: PropTypes.func.isRequired,
  onZoomOut: PropTypes.func.isRequired,
  onUndo: PropTypes.func.isRequired,
  onRedo: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  language: PropTypes.string.isRequired,
  onLanguageChange: PropTypes.func.isRequired,
  fontSize: PropTypes.number.isRequired,
  onFontSizeChange: PropTypes.func.isRequired
};

EditorToolbar.displayName = 'EditorToolbar';
export default EditorToolbar; 