import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';

const WhiteboardPage = () => {
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);

  useEffect(() => {
    if (!canvasRef.current) return;

    const initCanvas = () => {
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        isDrawingMode: true,
        width: window.innerWidth - 210, // Subtract sidebar width
        height: window.innerHeight - 60, // Subtract navbar height
        backgroundColor: '#ffffff'
      });

      setCanvas(fabricCanvas);

      // Set initial brush
      fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
      fabricCanvas.freeDrawingBrush.color = color;
      fabricCanvas.freeDrawingBrush.width = brushSize;

      // Handle window resize
      const handleResize = () => {
        fabricCanvas.setDimensions({
          width: window.innerWidth - 210,
          height: window.innerHeight - 60
        });
        fabricCanvas.renderAll();
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        fabricCanvas.dispose();
      };
    };

    const timeoutId = setTimeout(initCanvas, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  // Update canvas when tools change
  useEffect(() => {
    if (!canvas) return;

    switch (tool) {
      case 'pencil':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = color;
        break;
      case 'eraser':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = '#ffffff';
        break;
      default:
        canvas.isDrawingMode = false;
    }
    canvas.freeDrawingBrush.width = brushSize;
  }, [tool, color, brushSize, canvas]);

  return (
    <div className="whiteboard-page">
      <div className="whiteboard-container">
        <div className="whiteboard-toolbar">
          <div className="tool-group">
            <button
              className={`tool-button ${tool === 'pencil' ? 'active' : ''}`}
              onClick={() => setTool('pencil')}
            >
              Pencil
            </button>
            <button
              className={`tool-button ${tool === 'eraser' ? 'active' : ''}`}
              onClick={() => setTool('eraser')}
            >
              Eraser
            </button>
          </div>
          <div className="tool-group">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              title="Choose color"
            />
            <input
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              title="Brush size"
            />
          </div>
          <div className="tool-group">
            <button
              className="tool-button"
              onClick={() => {
                if (canvas) {
                  canvas.clear();
                  canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
                }
              }}
            >
              Clear
            </button>
          </div>
        </div>
        <div className="canvas-container">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
};

export default WhiteboardPage; 