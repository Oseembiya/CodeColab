import PropTypes from 'prop-types';
import { 
  FaPencilAlt, 
  FaEraser, 
  FaTrash, 
  FaPalette 
} from 'react-icons/fa';

const WhiteboardToolbar = ({
  activeColor,
  setActiveColor,
  brushSize,
  setBrushSize,
  tool,
  setTool,
  onClear
}) => {
  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'
  ];

  return (
    <div className="whiteboard-toolbar">
      <div className="tool-group">
        <button
          className={`tool-button ${tool === 'pencil' ? 'active' : ''}`}
          onClick={() => setTool('pencil')}
          title="Pencil"
        >
          <FaPencilAlt />
        </button>
        <button
          className={`tool-button ${tool === 'eraser' ? 'active' : ''}`}
          onClick={() => setTool('eraser')}
          title="Eraser"
        >
          <FaEraser />
        </button>
      </div>

      <div className="tool-group">
        <div className="color-picker">
          <button className="color-button" title="Color Picker">
            <FaPalette style={{ color: activeColor }} />
          </button>
          <div className="color-palette">
            {colors.map(color => (
              <button
                key={color}
                className={`color-option ${activeColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setActiveColor(color)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="tool-group">
        <input
          type="range"
          min="1"
          max="50"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          title="Brush Size"
        />
      </div>

      <div className="tool-group">
        <button
          className="tool-button clear-button"
          onClick={onClear}
          title="Clear Canvas"
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
};

WhiteboardToolbar.propTypes = {
  activeColor: PropTypes.string.isRequired,
  setActiveColor: PropTypes.func.isRequired,
  brushSize: PropTypes.number.isRequired,
  setBrushSize: PropTypes.func.isRequired,
  tool: PropTypes.string.isRequired,
  setTool: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired
};

export default WhiteboardToolbar; 