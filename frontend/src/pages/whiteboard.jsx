import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fabric } from "fabric";
import { useSession } from "../contexts/SessionContext";
import { useSocket } from "../contexts/SocketContext";
import {
  FaPencilAlt,
  FaEraser,
  FaSquare,
  FaCircle,
  FaFont,
  FaArrowsAlt,
  FaTrash,
  FaPalette,
  FaSave,
  FaArrowLeft,
  FaCode,
} from "react-icons/fa";
import "../styles/pages/Whiteboard.css";

// Placeholder for video chat component
const VideoPanel = () => (
  <div className="video-panel-placeholder">
    <div className="video-header">
      <h3>Video Chat</h3>
    </div>
    <div className="video-content">
      <p>Video chat will be implemented here</p>
    </div>
  </div>
);

const Whiteboard = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { joinSession, leaveSession } = useSession();
  const { socket, connected } = useSocket();
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);

  const [activeTool, setActiveTool] = useState("pencil");
  const [activeColor, setActiveColor] = useState("#5c5fbb");
  const [brushWidth, setBrushWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(true);

  // Colors palette
  const colors = [
    "#5c5fbb",
    "#FFFFFF",
    "#FF5252",
    "#4CAF50",
    "#FFC107",
    "#2196F3",
  ];

  // Initialize canvas and fabric
  useEffect(() => {
    // Check if canvas already initialized
    if (fabricCanvasRef.current) {
      return;
    }

    // Create fabric canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      width: canvasRef.current.offsetWidth,
      height: canvasRef.current.offsetHeight,
      backgroundColor: "#151618",
      selection: true,
    });

    // Assign to ref
    fabricCanvasRef.current = canvas;

    // Set up drawing mode
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = brushWidth;

    // Handle drawing events
    canvas.on("path:created", (e) => {
      if (socket && connected) {
        // Send drawing data to server
        const pathAsJson = e.path.toJSON();
        socket.emit("whiteboard-draw", {
          sessionId,
          objects: [pathAsJson],
        });
      }
    });

    // Handle object modification
    canvas.on("object:modified", (e) => {
      if (socket && connected) {
        // Send updated object to server
        const objectAsJson = e.target.toJSON();
        socket.emit("whiteboard-update", {
          sessionId,
          object: objectAsJson,
        });
      }
    });

    // Handle window resize
    const handleResize = () => {
      canvas.setWidth(canvasRef.current.offsetWidth);
      canvas.setHeight(canvasRef.current.offsetHeight);
      canvas.renderAll();
    };

    window.addEventListener("resize", handleResize);

    // Clean up
    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [activeColor, brushWidth, sessionId, socket, connected]);

  // Join session
  useEffect(() => {
    const initSession = async () => {
      try {
        // Join the session
        await joinSession(sessionId);

        // Subscribe to whiteboard events
        if (socket) {
          socket.emit("join-session", sessionId);

          // Listen for drawing events from other users
          socket.on("whiteboard-draw", (data) => {
            if (data.sessionId === sessionId && fabricCanvasRef.current) {
              // Add received objects to canvas
              fabric.util.enlivenObjects(data.objects, (objects) => {
                objects.forEach((obj) => {
                  fabricCanvasRef.current.add(obj);
                });
                fabricCanvasRef.current.renderAll();
              });
            }
          });

          // Listen for object updates
          socket.on("whiteboard-update", (data) => {
            if (data.sessionId === sessionId && fabricCanvasRef.current) {
              // Update object on canvas
              const canvas = fabricCanvasRef.current;
              const objects = canvas.getObjects();
              const targetObject = objects.find(
                (obj) => obj.id === data.object.id
              );

              if (targetObject) {
                targetObject.set(data.object);
                canvas.renderAll();
              }
            }
          });

          // Listen for clear events
          socket.on("whiteboard-clear", (data) => {
            if (data.sessionId === sessionId && fabricCanvasRef.current) {
              fabricCanvasRef.current.clear();
              fabricCanvasRef.current.setBackgroundColor("#151618", () => {
                fabricCanvasRef.current.renderAll();
              });
            }
          });
        }
      } catch (error) {
        console.error("Failed to join session:", error);
        navigate("/");
      }
    };

    initSession();

    // Cleanup
    return () => {
      if (socket) {
        socket.off("whiteboard-draw");
        socket.off("whiteboard-update");
        socket.off("whiteboard-clear");
        leaveSession();
      }
    };
  }, [sessionId, joinSession, leaveSession, socket, navigate]);

  // Update canvas tool when active tool changes
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

    switch (activeTool) {
      case "pencil":
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = activeColor;
        canvas.freeDrawingBrush.width = brushWidth;
        break;
      case "eraser":
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = "#151618"; // Background color
        canvas.freeDrawingBrush.width = brushWidth * 3;
        break;
      case "select":
        canvas.isDrawingMode = false;
        break;
      case "rectangle":
        canvas.isDrawingMode = false;
        setIsDrawing(true);
        break;
      case "circle":
        canvas.isDrawingMode = false;
        setIsDrawing(true);
        break;
      case "text":
        canvas.isDrawingMode = false;
        // Add text
        const text = new fabric.IText("Click to edit text", {
          left: canvas.width / 2,
          top: canvas.height / 2,
          fill: activeColor,
          fontFamily: "Arial",
          fontSize: 20,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
        break;
      default:
        canvas.isDrawingMode = true;
    }
  }, [activeTool, activeColor, brushWidth]);

  // Handle tool selection
  const handleToolSelect = (tool) => {
    setActiveTool(tool);
  };

  // Handle color selection
  const handleColorSelect = (color) => {
    setActiveColor(color);
    if (activeTool === "eraser") {
      setActiveTool("pencil");
    }
  };

  // Handle brush size change
  const handleBrushSizeChange = (e) => {
    setBrushWidth(parseInt(e.target.value));
  };

  // Handle canvas clear
  const handleClearCanvas = () => {
    if (fabricCanvasRef.current) {
      if (
        window.confirm("Are you sure you want to clear the entire whiteboard?")
      ) {
        fabricCanvasRef.current.clear();
        fabricCanvasRef.current.setBackgroundColor("#151618", () => {
          fabricCanvasRef.current.renderAll();
        });

        // Notify others
        if (socket && connected) {
          socket.emit("whiteboard-clear", {
            sessionId,
          });
        }
      }
    }
  };

  // Handle save canvas
  const handleSaveCanvas = () => {
    if (fabricCanvasRef.current) {
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: "png",
        multiplier: 2,
      });

      // Create download link
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = `whiteboard-${sessionId.substring(0, 8)}.png`;
      link.click();
    }
  };

  // Handle back navigation
  const handleBack = () => {
    leaveSession();
    navigate("/");
  };

  return (
    <div className="whiteboard-container">
      {/* Whiteboard Header */}
      <div className="whiteboard-header">
        <div className="header-left">
          <button className="back-button" onClick={handleBack}>
            <FaArrowLeft />
          </button>
          <h1>Whiteboard: {sessionId.substring(0, 8)}</h1>
          <div className="connection-status">
            <span
              className={`status-indicator ${
                connected ? "connected" : "disconnected"
              }`}
            ></span>
            {connected ? "Connected" : "Disconnected"}
          </div>
        </div>

        <div className="header-right">
          <Link to={`/session/${sessionId}`} className="editor-link">
            <FaCode /> Code Editor
          </Link>
          <button className="save-button" onClick={handleSaveCanvas}>
            <FaSave /> Save Image
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="tools">
          <button
            className={`tool-button ${activeTool === "pencil" ? "active" : ""}`}
            onClick={() => handleToolSelect("pencil")}
            title="Pencil"
          >
            <FaPencilAlt />
          </button>
          <button
            className={`tool-button ${activeTool === "eraser" ? "active" : ""}`}
            onClick={() => handleToolSelect("eraser")}
            title="Eraser"
          >
            <FaEraser />
          </button>
          <button
            className={`tool-button ${
              activeTool === "rectangle" ? "active" : ""
            }`}
            onClick={() => handleToolSelect("rectangle")}
            title="Rectangle"
          >
            <FaSquare />
          </button>
          <button
            className={`tool-button ${activeTool === "circle" ? "active" : ""}`}
            onClick={() => handleToolSelect("circle")}
            title="Circle"
          >
            <FaCircle />
          </button>
          <button
            className={`tool-button ${activeTool === "text" ? "active" : ""}`}
            onClick={() => handleToolSelect("text")}
            title="Text"
          >
            <FaFont />
          </button>
          <button
            className={`tool-button ${activeTool === "select" ? "active" : ""}`}
            onClick={() => handleToolSelect("select")}
            title="Select"
          >
            <FaArrowsAlt />
          </button>
          <button
            className="tool-button danger"
            onClick={handleClearCanvas}
            title="Clear All"
          >
            <FaTrash />
          </button>
        </div>

        <div className="brush-controls">
          <div className="brush-size">
            <span>Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={brushWidth}
              onChange={handleBrushSizeChange}
            />
            <span>{brushWidth}px</span>
          </div>

          <div className="color-palette">
            <FaPalette className="palette-icon" />
            {colors.map((color) => (
              <button
                key={color}
                className={`color-button ${
                  activeColor === color ? "active" : ""
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Canvas container */}
      <div className="canvas-container">
        <canvas ref={canvasRef} />
      </div>

      {/* Video Panel */}
      {isVideoOpen && (
        <div className="video-panel">
          <VideoPanel />
          <button
            className="video-toggle"
            onClick={() => setIsVideoOpen(false)}
          >
            Hide
          </button>
        </div>
      )}

      {!isVideoOpen && (
        <button
          className="video-show-button"
          onClick={() => setIsVideoOpen(true)}
        >
          Show Video
        </button>
      )}
    </div>
  );
};

export default Whiteboard;
