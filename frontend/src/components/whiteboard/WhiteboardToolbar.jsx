import PropTypes from "prop-types";
import {
  FaPencilAlt,
  FaMousePointer,
  FaEraser,
  FaTrash,
  FaDownload,
  FaCircle,
  FaSquare,
  FaFont,
  FaMinus,
} from "react-icons/fa";

const WhiteboardToolbar = ({
  activeTool,
  activeColor,
  brushWidth,
  onToolChange,
  onColorChange,
  onBrushWidthChange,
  onClear,
  onExport,
}) => {
  // Predefined colors
  const colors = [
    "#000000", // Black
    "#ffffff", // White
    "#ff0000", // Red
    "#00ff00", // Green
    "#0000ff", // Blue
    "#ffff00", // Yellow
    "#ff00ff", // Magenta
    "#00ffff", // Cyan
    "#ff8000", // Orange
    "#8000ff", // Purple
  ];

  // Tool buttons configuration
  const tools = [
    { id: "pencil", icon: <FaPencilAlt />, tooltip: "Pencil" },
    { id: "select", icon: <FaMousePointer />, tooltip: "Select" },
    { id: "eraser", icon: <FaEraser />, tooltip: "Eraser" },
    { id: "line", icon: <FaMinus />, tooltip: "Line" },
    { id: "circle", icon: <FaCircle />, tooltip: "Circle" },
    { id: "rectangle", icon: <FaSquare />, tooltip: "Rectangle" },
    { id: "text", icon: <FaFont />, tooltip: "Text" },
  ];

  // Brush sizes
  const brushSizes = [2, 5, 10, 15, 20];

  return (
    <div className="whiteboard-toolbar">
      <div className="tools-section">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`tool-btn ${activeTool === tool.id ? "active" : ""}`}
            onClick={() => onToolChange(tool.id)}
            title={tool.tooltip}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="colors-section">
        {colors.map((color) => (
          <button
            key={color}
            className={`color-btn ${activeColor === color ? "active" : ""}`}
            style={{ backgroundColor: color }}
            onClick={() => onColorChange(color)}
            title={color}
          />
        ))}
        <input
          type="color"
          value={activeColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="color-picker"
          title="Custom Color"
        />
      </div>

      <div className="brush-size-section">
        {brushSizes.map((size) => (
          <button
            key={size}
            className={`brush-size-btn ${brushWidth === size ? "active" : ""}`}
            onClick={() => onBrushWidthChange(size)}
            title={`${size}px`}
          >
            <div
              className="brush-size-preview"
              style={{
                width: size,
                height: size,
                maxWidth: "20px",
                maxHeight: "20px",
                minWidth: "4px",
                minHeight: "4px",
              }}
            />
          </button>
        ))}
      </div>

      <div className="actions-section">
        <button className="action-btn" onClick={onClear} title="Clear Canvas">
          <FaTrash />
        </button>
        <button className="action-btn" onClick={onExport} title="Export as PNG">
          <FaDownload />
        </button>
      </div>
    </div>
  );
};

WhiteboardToolbar.propTypes = {
  activeTool: PropTypes.string.isRequired,
  activeColor: PropTypes.string.isRequired,
  brushWidth: PropTypes.number.isRequired,
  onToolChange: PropTypes.func.isRequired,
  onColorChange: PropTypes.func.isRequired,
  onBrushWidthChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
};

export default WhiteboardToolbar;
