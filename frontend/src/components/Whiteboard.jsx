import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric-pure-browser';

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);

  useEffect(() => {
    const initCanvas = () => {
      // Make sure the canvas element exists
      if (!canvasRef.current) return;

      try {
        // Get the parent container dimensions
        const container = canvasRef.current.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Initialize fabric canvas with proper dimensions
        const fabricCanvas = new fabric.Canvas(canvasRef.current, {
          width,
          height,
          backgroundColor: 'white',
          isDrawingMode: true
        });

        setCanvas(fabricCanvas);

        // Handle window resize
        const handleResize = () => {
          fabricCanvas.setDimensions({
            width: container.clientWidth,
            height: container.clientHeight
          });
          fabricCanvas.renderAll();
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
          window.removeEventListener('resize', handleResize);
          fabricCanvas.dispose();
        };
      } catch (error) {
        console.error('Error initializing canvas:', error);
      }
    };

    initCanvas();
  }, []);

  return (
    <div className="whiteboard-container">
      <div className="canvas-container">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default Whiteboard;