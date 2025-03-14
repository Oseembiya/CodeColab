import { memo, useState } from 'react';
import PropTypes from 'prop-types';

const OutputPanel = memo(({ 
  output, 
  error,
  height, 
  onDragStart,
  onCollapse 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
    if (onCollapse) {
      onCollapse(!isCollapsed);
    }
  };

  return (
    <div className={`output-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div 
        className="output-drag-handle" 
        onMouseDown={onDragStart}
        onClick={handleToggle}
      >
        <div className="drag-handle-content">
          <div className="drag-lines">
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
      
      <div className="output-content">
        <div className="output-header">
          <h3>Output</h3>
        </div>
        <div className={`output-scroll ${error ? 'error' : ''}`}>
          {output ? (
            <pre>{output}</pre>
          ) : (
            <div className="no-output">Run your code to see output</div>
          )}
        </div>
      </div>
    </div>
  );
});

OutputPanel.propTypes = {
  output: PropTypes.string,
  error: PropTypes.bool,
  height: PropTypes.number,
  onDragStart: PropTypes.func,
  onCollapse: PropTypes.func
};

OutputPanel.displayName = 'OutputPanel';
export default OutputPanel; 