import { useState, useRef, useEffect, useCallback, Suspense, lazy } from "react";
import { useParams, useLocation } from 'react-router-dom';
import { io } from "socket.io-client";
import { useAuth } from "../../hooks/useAuth";
import EditorToolbar from "./EditorToolbar";
import OutputPanel from "./OutputPanel";
import VideoChat from "../collaboration/VideoChat";
import SessionInfo from "../sessions/SessionInfo";
import { FaExpandAlt, FaCompressAlt } from 'react-icons/fa';

// Lazy load Monaco editor
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

const CodeEditor = ({ collaborative = false }) => {
  const { sessionId } = useParams();
  const location = useLocation();
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [participants, setParticipants] = useState(new Map());
  const [sessionInfo, setSessionInfo] = useState(null);
  const [showVideo, setShowVideo] = useState(true);
  const [layout, setLayout] = useState('default');

  // Add these useRef declarations
  const dragStartY = useRef(null);
  const dragStartHeight = useRef(null);

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

  useEffect(() => {
    if (collaborative && sessionId) {
      const fetchSessionInfo = async () => {
        try {
          const response = await fetch(`/api/sessions/${sessionId}`);
          const data = await response.json();
          setSessionInfo(data);
        } catch (error) {
          console.error('Error fetching session info:', error);
        }
      };
      fetchSessionInfo();

      const socket = io(import.meta.env.VITE_SOCKET_URL);
      socketRef.current = socket;

      socket.emit('join-session', {
        sessionId,
        userId: user.uid,
        username: user.displayName
      });

      socket.on('code-update', ({ content, userId }) => {
        if (userId !== user.uid && editorRef.current) {
          const position = editorRef.current.getPosition();
          editorRef.current.setValue(content);
          editorRef.current.setPosition(position);
        }
      });

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

      return () => socket.disconnect();
    }
  }, [collaborative, sessionId, user]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;

    if (collaborative) {
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

  const handleEditorChange = (value, event) => {
    if (collaborative && socketRef.current) {
      socketRef.current.emit('code-change', {
        sessionId,
        content: value,
        userId: user.uid
      });
    }
  };

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

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  const handleRunCode = async () => {
    if (!editorRef.current) return;

    const code = editorRef.current.getValue();
    setIsLoading(true);
    setOutput("Running code...");

    try {
      const submitResponse = await fetch('https://judge0-ce.p.rapidapi.com/submissions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          'X-RapidAPI-Key': import.meta.env.VITE_RAPIDAPI_KEY,
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

      let result;
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));

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

        if (result.status.id > 2) {
          break;
        }

        attempts++;
      }

      let outputText = '';

      if (result.status) {
        outputText += `Status: ${result.status.description}\n\n`;
      }

      if (result.stdout) {
        outputText += `Output:\n${result.stdout}\n`;
      }

      if (result.stderr) {
        outputText += `\nErrors:\n${result.stderr}\n`;
      }

      if (result.compile_output) {
        outputText += `\nCompilation Output:\n${result.compile_output}\n`;
      }

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

  const handleTouchMove = (event) => {
    if (isDragging) {
      const touch = event instanceof TouchEvent ? event.touches[0] : event;
      const deltaY = touch.clientY - dragStartY.current;
      const newHeight = dragStartHeight.current + deltaY;
      setOutputHeight(Math.max(200, Math.min(800, newHeight)));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
  };

  return (
    <div className={`editor-container ${layout} ${isFullScreen ? 'fullscreen' : ''}`}>
      {collaborative && (
        <div className="session-header">
          {sessionInfo && <SessionInfo session={sessionInfo} />}
          <div className="layout-controls">
            <button 
              onClick={() => handleLayoutChange('default')}
              className={layout === 'default' ? 'active' : ''}
            >
              Default View
            </button>
            <button 
              onClick={() => handleLayoutChange('video-focus')}
              className={layout === 'video-focus' ? 'active' : ''}
            >
              Video Focus
            </button>
            <button 
              onClick={() => handleLayoutChange('code-focus')}
              className={layout === 'code-focus' ? 'active' : ''}
            >
              Code Focus
            </button>
            <button 
              onClick={() => setShowVideo(!showVideo)}
              className={showVideo ? 'active' : ''}
            >
              Toggle Video
            </button>
          </div>
        </div>
      )}

      <div className="editor-main">
        <div className="editor-content">
          <EditorToolbar 
            onRun={handleRunCode}
            onCheck={handleCheckAnswer}
            isLoading={isLoading}
            language={language}
            onLanguageChange={handleLanguageChange}
            languages={languages}
            isCorrect={isCorrect}
          />

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

            <button 
              className="fullscreen-toggle"
              onClick={() => setIsFullScreen(!isFullScreen)}
            >
              {isFullScreen ? <FaCompressAlt /> : <FaExpandAlt />}
            </button>
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

        {collaborative && showVideo && (
          <div className={`collaboration-panel ${layout}`}>
            <VideoChat 
              sessionId={sessionId}
              userId={user.uid}
            />
            <div className="participants-list">
              <h3>Participants</h3>
              {Array.from(participants.entries()).map(([userId, { username }]) => (
                <div key={userId} className="participant">
                  {username}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor; 