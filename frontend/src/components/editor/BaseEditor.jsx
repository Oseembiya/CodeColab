import { useState, useRef, Suspense, lazy, useCallback } from 'react';
import PropTypes from 'prop-types';
import EditorToolbar from './EditorToolbar';
import OutputPanel from './OutputPanel';
import { FaExpandAlt, FaCompressAlt } from 'react-icons/fa';

// Lazy load Monaco editor
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

const BaseEditor = ({ 
  onEditorMount,
  onEditorChange,
  language = 'javascript',
  onLanguageChange,
  onRunCode,
  initialValue = "// Start coding here"
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

  const [fontSize, setFontSize] = useState(14);
  const [editorOptions, setEditorOptions] = useState({
    minimap: { enabled: false },
    fontSize: 14,
    automaticLayout: true,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    readOnly: false,
    cursorStyle: 'line',
    tabSize: 2,
    wordWrap: 'on',
    formatOnPaste: true,
    formatOnType: true
  });

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, handleRunCode);
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, handleFormat);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, handleZoomIn);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, handleZoomOut);

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

  const handleFormat = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    setFontSize(prev => Math.min(prev + 2, 24));
    setEditorOptions(prev => ({
      ...prev,
      fontSize: Math.min(prev.fontSize + 2, 24)
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setFontSize(prev => Math.max(prev - 2, 12));
    setEditorOptions(prev => ({
      ...prev,
      fontSize: Math.max(prev.fontSize - 2, 12)
    }));
  }, []);

  const handleUndo = useCallback(() => {
    editorRef.current?.trigger('keyboard', 'undo', null);
  }, []);

  const handleRedo = useCallback(() => {
    editorRef.current?.trigger('keyboard', 'redo', null);
  }, []);

  const handleCopy = useCallback(() => {
    const code = editorRef.current?.getValue();
    if (code) {
      navigator.clipboard.writeText(code);
    }
  }, []);

  const handleDownload = useCallback(() => {
    const code = editorRef.current?.getValue();
    if (code) {
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `code.${language}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [language]);

  const handleUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (content && editorRef.current) {
          editorRef.current.setValue(content);
        }
      };
      reader.readAsText(file);
    }
  }, []);

  return (
    <div className={`editor-container ${isFullScreen ? 'fullscreen' : ''}`}>
      <EditorToolbar 
        onRun={handleRunCode}
        onFormat={handleFormat}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onUpload={handleUpload}
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
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
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
              options={editorOptions}
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
  language: PropTypes.string.isRequired,
  onLanguageChange: PropTypes.func.isRequired,
  onRunCode: PropTypes.func.isRequired,
  initialValue: PropTypes.string
};

export default BaseEditor; 