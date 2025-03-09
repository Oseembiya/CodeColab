import { useState, useRef, useEffect, useCallback, Suspense, lazy } from "react";
import { useParams } from 'react-router-dom';
import { io } from "socket.io-client";
import { useAuth } from "../../hooks/useAuth";
import EditorToolbar from "./EditorToolbar";
import OutputPanel from "./OutputPanel";

// Lazy load Monaco editor
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

const CodeEditor = ({ collaborative = false }) => {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);
  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [outputHeight, setOutputHeight] = useState(200);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const [participants, setParticipants] = useState(new Map());

  const languages = [
    { id: "javascript", name: "JavaScript" },
    { id: "python", name: "Python" },
    { id: "java", name: "Java" },
    { id: "cpp", name: "C++" },
    { id: "csharp", name: "C#" }
  ];

  const languageIds = {
    javascript: 63,
    python: 71,
    java: 62,
    cpp: 54,
    csharp: 51,
    go: 60,
    kotlin: 78
  };

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!collaborative || !sessionId) return;

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
    socketRef.current = io(SOCKET_URL);
    const socket = socketRef.current;

    socket.emit('join-session', {
      sessionId,
      userId: user.uid,
      username: user.displayName
    });

    // Handle code updates from other users
    socket.on('code-update', ({ content, userId }) => {
      if (userId !== user.uid && editorRef.current) {
        const currentPosition = editorRef.current.getPosition();
        editorRef.current.setValue(content);
        editorRef.current.setPosition(currentPosition);
      }
    });

    // Handle user joined/left events
    socket.on('user-joined', ({ userId, username }) => {
      setParticipants(prev => new Map(prev).set(userId, { username }));
    });

    socket.on('user-left', ({ userId }) => {
      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [collaborative, sessionId, user]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;

    if (collaborative) {
      // Set up change event listener for collaborative editing
      editor.onDidChangeModelContent(() => {
        const content = editor.getValue();
        socketRef.current?.emit('code-change', {
          sessionId,
          content,
          userId: user.uid
        });
      });
    }
  };

  // Handle local code changes
  const handleEditorChange = (event) => {
    if (collaborative && socketRef.current) {
      socketRef.current.emit('code-change', {
        sessionId,
        change: event.changes[0],
        userId: user.uid
      });
    }
  };

  // Handle cursor movement
  const handleCursorMove = (event) => {
    if (collaborative && socketRef.current) {
      const position = event.position;
      socketRef.current.emit('cursor-move', {
        sessionId,
        cursor: position,
        userId: user.uid
      });
    }
  };

  // Handle language change
  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  // Handle run code
  const handleRunCode = async () => {
    if (!editorRef.current) return;

    const code = editorRef.current.getValue();
    setIsLoading(true);
    setOutput("Running code...");

    try {
      // First API call to submit the code
      const submitResponse = await fetch('https://judge0-ce.p.rapidapi.com/submissions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          'X-RapidAPI-Key': import.meta.env.VITE_RAPIDAPI_KEY, // Make sure this is in your .env file
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageIds[language],
          stdin: ''
        })
      });

      if (!submitResponse.ok) {
        throw new Error(`HTTP error! status: ${submitResponse.status}`);
      }

      const { token } = await submitResponse.json();
      if (!token) {
        throw new Error('No token received from Judge0');
      }

      // Poll for results
      let result;
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between attempts

        const statusResponse = await fetch(`https://judge0-ce.p.rapidapi.com/submissions/${token}`, {
          headers: {
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
            'X-RapidAPI-Key': import.meta.env.VITE_RAPIDAPI_KEY,
          }
        });

        if (!statusResponse.ok) {
          throw new Error(`HTTP error! status: ${statusResponse.status}`);
        }

        result = await statusResponse.json();

        // Check if processing is complete
        if (result.status.id > 2) { // 1: In Queue, 2: Processing
          break;
        }

        attempts++;
      }

      // Format the output
      let outputText = '';

      // Add status message
      if (result.status) {
        outputText += `Status: ${result.status.description}\n\n`;
      }

      // Add stdout if exists
      if (result.stdout) {
        outputText += `Output:\n${result.stdout}\n`;
      }

      // Add stderr if exists
      if (result.stderr) {
        outputText += `\nErrors:\n${result.stderr}\n`;
      }

      // Add compile output if exists
      if (result.compile_output) {
        outputText += `\nCompilation Output:\n${result.compile_output}\n`;
      }

      // Add execution details
      outputText += `\nExecution Time: ${result.time || '0'} seconds`;
      outputText += `\nMemory Used: ${result.memory || '0'} KB`;

      setOutput(outputText);

    } catch (error) {
      console.error('Error executing code:', error);
      setOutput(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle check answer
  const handleCheckAnswer = async () => {
    if (collaborative) {
      console.error("Cannot check answer in collaborative mode");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/check-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          language,
          code: editorRef.current.getValue()
        })
      });

      const data = await response.json();
      setOutput(data.output);
      setIsCorrect(data.isCorrect);
    } catch (error) {
      console.error("Error checking answer:", error);
      setOutput("Error checking answer");
      setIsCorrect(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle drag start
  const handleDragStart = (event) => {
    if (event instanceof TouchEvent) {
      dragStartY.current = event.touches[0].clientY;
      dragStartHeight.current = outputHeight;
    } else {
      dragStartY.current = event.clientY;
      dragStartHeight.current = outputHeight;
    }
    setIsDragging(true);
  };

  // Handle touch start
  const handleTouchStart = (event) => {
    if (event instanceof TouchEvent) {
      dragStartY.current = event.touches[0].clientY;
      dragStartHeight.current = outputHeight;
    } else {
      dragStartY.current = event.clientY;
      dragStartHeight.current = outputHeight;
    }
    setIsDragging(true);
  };

  // Handle touch move
  const handleTouchMove = (event) => {
    if (isDragging) {
      const touch = event instanceof TouchEvent ? event.touches[0] : event;
      const deltaY = touch.clientY - dragStartY.current;
      const newHeight = dragStartHeight.current + deltaY;
      setOutputHeight(Math.max(200, Math.min(800, newHeight)));
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="editor-container">
      <EditorToolbar 
        onRun={handleRunCode}
        onCheck={handleCheckAnswer}
        isLoading={isLoading}
        language={language}
        onLanguageChange={handleLanguageChange}
        languages={languages}
        isCorrect={isCorrect}
      />

      {collaborative && (
        <div className="participants-bar">
          <h3>Participants</h3>
          <div className="participants-list">
            {Array.from(participants.entries()).map(([userId, { username }]) => (
              <div key={userId} className="participant">
                {username}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="editor-main">
        <div className="monaco-editor-wrapper">
          <Suspense fallback={<div>Loading editor...</div>}>
            <MonacoEditor
              height="100%"
              language={language}
              theme="vs-dark"
              defaultValue="// Start coding here"
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                readOnly: false,
                cursorStyle: 'line',
              }}
              onChange={handleEditorChange}
              onCursorPositionChange={handleCursorMove}
            />
          </Suspense>
        </div>

        <OutputPanel 
          output={output}
          height={outputHeight}
          isCollapsed={isCollapsed}
          onDragStart={handleDragStart}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </div>
    </div>
  );
};

export default CodeEditor; 