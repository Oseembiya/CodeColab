import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import WhiteboardToolbar from "./WhiteboardToolbar";
import { useSocket } from "../../contexts/SocketContext";
import { useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

let fabric;

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [activeColor, setActiveColor] = useState("#000000");
  const [brushWidth, setBrushWidth] = useState(5);
  const [activeTool, setActiveTool] = useState("pencil");
  const [isDrawing, setIsDrawing] = useState(false);
  const { socket } = useSocket();
  const { sessionId } = useParams();
  const { currentUser } = useAuth();

  // Initialize canvas on component mount
  useEffect(() => {
    if (!canvasRef.current) return;

    const initCanvas = async () => {
      try {
        // Try CommonJS-style require
        fabric = require("fabric").fabric;

        const fabricCanvas = new fabric.Canvas(canvasRef.current, {
          isDrawingMode: true,
          width: window.innerWidth,
          height: window.innerHeight - 100,
          backgroundColor: "#ffffff",
        });

        setCanvas(fabricCanvas);

        // Set up resize handler
        const handleResize = () => {
          fabricCanvas.setDimensions({
            width: window.innerWidth,
            height: window.innerHeight - 100,
          });
          fabricCanvas.renderAll();
        };

        window.addEventListener("resize", handleResize);
      } catch (error) {
        console.error("Error initializing fabric:", error);
      }
    };

    initCanvas();

    return () => {
      if (canvas) {
        window.removeEventListener("resize", handleResize);
        canvas.dispose();
      }
    };
  }, []);

  // Handle tool changes
  useEffect(() => {
    if (!canvas) return;

    if (activeTool === "pencil") {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = brushWidth;
    } else if (activeTool === "select") {
      canvas.isDrawingMode = false;
    } else if (activeTool === "eraser") {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = "#ffffff";
      canvas.freeDrawingBrush.width = brushWidth * 2;
    }
  }, [canvas, activeTool, activeColor, brushWidth]);

  // Set up Socket.IO for real-time collaboration
  useEffect(() => {
    if (!socket || !canvas || !sessionId) return;

    // Listen for drawing events from other users
    socket.on("whiteboard-draw", (data) => {
      if (data.userId === currentUser?.uid) return; // Ignore own events

      // Add received objects to canvas
      fabric.util.enlivenObjects(data.objects, (objects) => {
        objects.forEach((obj) => {
          canvas.add(obj);
        });
        canvas.renderAll();
      });
    });

    // Listen for clear events
    socket.on("whiteboard-clear", () => {
      canvas.clear();
      canvas.backgroundColor = "#ffffff";
      canvas.renderAll();
    });

    // Handle object modification events
    canvas.on("object:modified", () => {
      const jsonData = canvas.toJSON();
      socket.emit("whiteboard-update", {
        sessionId,
        userId: currentUser?.uid,
        canvasData: jsonData,
      });
    });

    // Handle drawing events
    canvas.on("path:created", (e) => {
      if (!isDrawing) return;

      const pathAsJson = e.path.toJSON();
      socket.emit("whiteboard-draw", {
        sessionId,
        userId: currentUser?.uid,
        objects: [pathAsJson],
      });
    });

    // Request current whiteboard state when joining
    socket.emit("whiteboard-join", {
      sessionId,
      userId: currentUser?.uid,
    });

    // Listen for full whiteboard state updates
    socket.on("whiteboard-state", (data) => {
      canvas.loadFromJSON(data.canvasData, canvas.renderAll.bind(canvas));
    });

    return () => {
      socket.off("whiteboard-draw");
      socket.off("whiteboard-clear");
      socket.off("whiteboard-state");
    };
  }, [socket, canvas, sessionId, currentUser, isDrawing]);

  // Event handlers for drawing state
  const handleMouseDown = () => setIsDrawing(true);
  const handleMouseUp = () => setIsDrawing(false);

  // Tools handlers
  const handleToolChange = (tool) => setActiveTool(tool);
  const handleColorChange = (color) => setActiveColor(color);
  const handleBrushWidthChange = (width) => setBrushWidth(width);

  const handleClear = () => {
    if (!canvas || !socket) return;

    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.renderAll();

    socket.emit("whiteboard-clear", { sessionId });
  };

  const handleExport = () => {
    if (!canvas) return;

    const dataURL = canvas.toDataURL({
      format: "png",
      quality: 1,
    });

    const link = document.createElement("a");
    link.download = `whiteboard-${sessionId}-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="whiteboard-container"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <WhiteboardToolbar
        activeTool={activeTool}
        activeColor={activeColor}
        brushWidth={brushWidth}
        onToolChange={handleToolChange}
        onColorChange={handleColorChange}
        onBrushWidthChange={handleBrushWidthChange}
        onClear={handleClear}
        onExport={handleExport}
      />
      <div className="canvas-container">
        <canvas ref={canvasRef} id="whiteboard-canvas" />
      </div>
    </div>
  );
};

Whiteboard.propTypes = {
  sessionId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
};

export default Whiteboard;
