import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import WhiteboardToolbar from './WhiteboardToolbar';

// Import fabric globally
import 'fabric';
const { fabric } = window;

const Whiteboard = ({ sessionId, userId }) => {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const [activeColor, setActiveColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('pencil');

  useEffect(() => {
    // Ensure fabric is loaded
    if (!fabric) {
      console.error('Fabric.js not loaded');
      return;
    }

    // Initialize canvas after a short delay to ensure DOM is ready
    const initCanvas = () => {
      if (!canvasRef.current) return;

      try {
        // Create canvas instance
        const canvas = new fabric.Canvas(canvasRef.current, {
          isDrawingMode: true,
          width: window.innerWidth / 2,
          height: window.innerHeight - 100,
          backgroundColor: '#ffffff'
        });

        fabricRef.current = canvas;

        // Set initial brush
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = activeColor;
        canvas.freeDrawingBrush.width = brushSize;

        // Handle window resize
        const handleResize = () => {
          canvas.setWidth(window.innerWidth / 2);
          canvas.setHeight(window.innerHeight - 100);
          canvas.renderAll();
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          canvas.dispose();
        };
      } catch (error) {
        console.error('Error initializing canvas:', error);
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(initCanvas, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  // Update canvas when tools change
  useEffect(() => {
    if (!fabricRef.current) return;

    const canvas = fabricRef.current;

    try {
      switch (tool) {
        case 'pencil':
          canvas.isDrawingMode = true;
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
          break;
        case 'eraser':
          canvas.isDrawingMode = true;
          // Use white color as eraser
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
          canvas.freeDrawingBrush.color = '#ffffff';
          break;
        default:
          canvas.isDrawingMode = false;
      }

      if (tool !== 'eraser') {
        canvas.freeDrawingBrush.color = activeColor;
      }
      canvas.freeDrawingBrush.width = brushSize;
    } catch (error) {
      console.error('Error updating canvas tools:', error);
    }
  }, [tool, activeColor, brushSize]);

  const handleClear = () => {
    if (!fabricRef.current) return;

    try {
      fabricRef.current.clear();
      fabricRef.current.setBackgroundColor('#ffffff', () => 
        fabricRef.current.renderAll()
      );
    } catch (error) {
      console.error('Error clearing canvas:', error);
    }
  };

  return (
    <div className="whiteboard-container">
      <WhiteboardToolbar
        activeColor={activeColor}
        setActiveColor={setActiveColor}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        tool={tool}
        setTool={setTool}
        onClear={handleClear}
      />
      <div className="canvas-container">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

Whiteboard.propTypes = {
  sessionId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired
};

export default Whiteboard; 