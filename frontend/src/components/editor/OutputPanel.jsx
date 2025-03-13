import { memo } from 'react';
import PropTypes from 'prop-types';

const OutputPanel = memo(({ 
  output, 
  error,
  height, 
  isCollapsed, 
  onDragStart,
  onCollapse 
}) => (
  <div 
    className={`output-panel ${isCollapsed ? 'collapsed' : ''}`} 
    style={{ height: isCollapsed ? '35px' : `${height}px` }}
  >
    <div 
      className="output-drag-handle" 
      onMouseDown={onDragStart}
      onClick={onCollapse}
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
));

OutputPanel.propTypes = {
  output: PropTypes.string,
  error: PropTypes.string,
  height: PropTypes.number.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  onDragStart: PropTypes.func.isRequired,
  onCollapse: PropTypes.func.isRequired
};

OutputPanel.displayName = 'OutputPanel';
export default OutputPanel; 