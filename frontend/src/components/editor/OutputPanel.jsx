import { memo } from 'react';
import PropTypes from 'prop-types';

const OutputPanel = memo(({ 
  output, 
  height, 
  isCollapsed, 
  onDragStart,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onCollapse 
}) => (
  <div 
    className={`output-panel ${isCollapsed ? 'collapsed' : ''}`} 
    style={{ height: isCollapsed ? '35px' : `${height}px` }}
  >
    <div 
      className="output-drag-handle" 
      onMouseDown={onDragStart}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
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
      <div className="output-scroll">
        {output && <pre>{output}</pre>}
      </div>
    </div>
  </div>
));

OutputPanel.propTypes = {
  output: PropTypes.string,
  height: PropTypes.number.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  onDragStart: PropTypes.func.isRequired,
  onTouchStart: PropTypes.func,
  onTouchMove: PropTypes.func,
  onTouchEnd: PropTypes.func,
  onCollapse: PropTypes.func.isRequired
};

OutputPanel.displayName = 'OutputPanel';
export default OutputPanel; 