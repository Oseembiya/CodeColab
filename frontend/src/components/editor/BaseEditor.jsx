import { useState, useRef, Suspense, lazy } from 'react';
import PropTypes from 'prop-types';
import EditorToolbar from './EditorToolbar';
import OutputPanel from './OutputPanel';
import { FaExpandAlt, FaCompressAlt } from 'react-icons/fa';

// Lazy load Monaco editor
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

const BaseEditor = ({ 
  onEditorMount,
  onEditorChange,
  onCursorMove,
  language = 'javascript',
  onLanguageChange,
  onRunCode,
  initialValue = "// Start coding here",
  readOnly = false,
  showCheckAnswer = false,
  onCheckAnswer = null
}) => {
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [outputHeight, setOutputHeight] = useState(200);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const editorRef = useRef(null);
  
  // Drag handling refs
  const dragStartY = useRef(null);
  const dragStartHeight = useRef(null);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    if (onEditorMount) {
      onEditorMount(editor);
    }
  };

  const handleRunCode = async () => {
    if (!editorRef.current) return;
    
    setIsLoading(true);
    setOutput("Running code...");

    try {
      const result = await onRunCode(editorRef.current.getValue(), language);
      setOutput(result);
    } catch (error) {
      console.error('Execution error:', error);
      setOutput(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Drag handlers
  const handleDragStart = (event) => {
    if (event instanceof TouchEvent) {
      dragStartY.current = event.touches[0].clientY;
    } else {
      dragStartY.current = event.clientY;
    }
    dragStartHeight.current = outputHeight;
    setIsDragging(true);
  };

  const handleDragMove = (event) => {
    if (!isDragging) return;
    
    const clientY = event instanceof TouchEvent ? 
      event.touches[0].clientY : 
      event.clientY;
    
    const deltaY = clientY - dragStartY.current;
    const newHeight = dragStartHeight.current - deltaY;
    
    setOutputHeight(Math.max(100, Math.min(800, newHeight)));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    onLanguageChange(newLanguage);
  };

  // Add a dummy check function if you don't need this functionality
  const handleCheck = () => {
    console.log('Check functionality not implemented');
  };

  return (
    <div className={`editor-container ${isFullScreen ? 'fullscreen' : ''}`}>
      <EditorToolbar 
        onRun={handleRunCode}
        onCheck={showCheckAnswer ? onCheckAnswer : handleCheck}
        isLoading={isLoading}
        language={language}
        onLanguageChange={handleLanguageChange}
        languages={[
          { id: "javascript", name: "JavaScript" },
          { id: "python", name: "Python" },
          { id: "java", name: "Java" },
          { id: "cpp", name: "C++" },
          { id: "csharp", name: "C#" }
        ]}
      />

      <div className="editor-content">
        <div className="monaco-editor-wrapper">
          <Suspense fallback={<div>Loading editor...</div>}>
            <MonacoEditor
              height="100%"
              language={language}
              theme="vs-dark"
              value={initialValue}
              onChange={onEditorChange}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                readOnly: readOnly,
                cursorStyle: 'line',
              }}
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
          error={error}
          height={outputHeight}
          isCollapsed={isCollapsed}
          onDragStart={handleDragStart}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </div>
    </div>
  );
};

BaseEditor.propTypes = {
  onEditorMount: PropTypes.func,
  onEditorChange: PropTypes.func,
  onCursorMove: PropTypes.func,
  language: PropTypes.string.isRequired,
  onLanguageChange: PropTypes.func.isRequired,
  onRunCode: PropTypes.func.isRequired,
  initialValue: PropTypes.string,
  readOnly: PropTypes.bool,
  showCheckAnswer: PropTypes.bool,
  onCheckAnswer: PropTypes.func
};

export default BaseEditor; 