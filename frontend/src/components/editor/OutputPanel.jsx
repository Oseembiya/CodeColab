import { memo, useState } from "react";
import PropTypes from "prop-types";

const OutputPanel = memo(
  ({
    output,
    error,
    height,
    isCollapsed: externalIsCollapsed,
    onDragStart,
    onCollapse,
  }) => {
    const [internalIsCollapsed, setInternalIsCollapsed] = useState(true);

    // Use the external isCollapsed state if provided
    const isCollapsed =
      externalIsCollapsed !== undefined
        ? externalIsCollapsed
        : internalIsCollapsed;

    const handleToggle = () => {
      setInternalIsCollapsed(!internalIsCollapsed);
      if (onCollapse) {
        onCollapse(!isCollapsed);
      }
    };

    // Create a memoized style object to prevent unnecessary re-renders
    const panelStyle = isCollapsed ? {} : { height: `${height}px` };

    return (
      <div
        className={`output-panel ${isCollapsed ? "collapsed" : ""}`}
        style={panelStyle}
      >
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
          <div className={`output-scroll ${error ? "error" : ""}`}>
            {output ? (
              <pre>{output}</pre>
            ) : (
              <div className="no-output">Run your code to see output</div>
            )}
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for memo
    // Only re-render if these specific props change
    return (
      prevProps.output === nextProps.output &&
      prevProps.error === nextProps.error &&
      prevProps.isCollapsed === nextProps.isCollapsed &&
      // Only consider height changes if not collapsed
      (prevProps.isCollapsed || prevProps.height === nextProps.height)
    );
  }
);

OutputPanel.propTypes = {
  output: PropTypes.string,
  error: PropTypes.bool,
  height: PropTypes.number,
  isCollapsed: PropTypes.bool,
  onDragStart: PropTypes.func,
  onCollapse: PropTypes.func,
};

OutputPanel.displayName = "OutputPanel";
export default OutputPanel;
