import {
  useState,
  useRef,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import PropTypes from "prop-types";
import EditorToolbar from "./EditorToolbar";
import OutputPanel from "./OutputPanel";
import { FaExpandAlt, FaCompressAlt } from "react-icons/fa";
import { getBoilerplate } from "../../services/codeExecution";

// Lazy load Monaco editor
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

const BaseEditor = ({
  onEditorMount,
  onEditorChange,
  language,
  onLanguageChange,
  onRunCode,
  initialValue = "// Start coding here",
}) => {
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [outputHeight, setOutputHeight] = useState(200);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  const editorRef = useRef(null);
  const dragStartY = useRef(null);
  const initialHeight = useRef(null);

  // Memoize editor options to prevent unnecessary rerenders
  const editorOptions = useMemo(
    () => ({
      minimap: { enabled: false },
      fontSize,
      automaticLayout: true,
      lineNumbers: "on",
      roundedSelection: false,
      scrollBeyondLastLine: false,
      tabSize: 2,
      wordWrap: "on",
    }),
    [fontSize]
  );

  const handleRunCode = async () => {
    if (!editorRef.current) return;

    setIsLoading(true);
    setOutput("Running code...");
    setError(null);

    try {
      const code = editorRef.current.getValue();
      const result = await onRunCode(code, language);
      setOutput(result);
    } catch (error) {
      setError(error.message);
      setOutput(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction("editor.action.formatDocument").run();
    }
  };

  const handleZoomIn = () => {
    setFontSize((prev) => Math.min(prev + 2, 24));
  };

  const handleZoomOut = () => {
    setFontSize((prev) => Math.max(prev - 2, 12));
  };

  const handleCopy = useCallback(() => {
    const code = editorRef.current?.getValue();
    if (code) {
      navigator.clipboard.writeText(code);
    }
  }, []);

  const handleDownload = useCallback(() => {
    const code = editorRef.current?.getValue();
    if (code) {
      const blob = new Blob([code], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
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

  const handleUndo = useCallback(() => {
    editorRef.current?.trigger("keyboard", "undo", null);
  }, []);

  const handleRedo = useCallback(() => {
    editorRef.current?.trigger("keyboard", "redo", null);
  }, []);

  // Add drag handlers
  const handleDragStart = (e) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    initialHeight.current = outputHeight;
    setIsDragging(true);

    // Add event listeners for dragging
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
  };

  const handleDragMove = useCallback(
    (e) => {
      if (!isDragging) return;

      // Use requestAnimationFrame to avoid forced reflow
      requestAnimationFrame(() => {
        // Read layout once
        const deltaY = dragStartY.current - e.clientY;
        const newHeight = Math.max(
          100,
          Math.min(800, initialHeight.current + deltaY)
        );

        // Write layout once
        setOutputHeight(newHeight);
      });
    },
    [isDragging]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
  }, [handleDragMove]);

  // Cleanup event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("mouseup", handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  // Debounced window resize handler to prevent frequent re-renders
  useEffect(() => {
    const handleResize = () => {
      // Trigger Monaco editor layout update
      if (editorRef.current) {
        editorRef.current.layout();
      }
    };

    // Debounce the resize event
    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    window.addEventListener("resize", debouncedResize);
    return () => {
      window.removeEventListener("resize", debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // When language changes, you might want to update the editor content
  useEffect(() => {
    if (!initialValue && editorRef.current) {
      const boilerplate = getBoilerplate(language);
      editorRef.current.setValue(boilerplate);
    }
  }, [language, initialValue]);

  return (
    <div className={`editor-container ${isFullScreen ? "fullscreen" : ""}`}>
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
        onLanguageChange={onLanguageChange}
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
              onMount={(editor) => {
                editorRef.current = editor;
                onEditorMount?.(editor);
              }}
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
  initialValue: PropTypes.string,
};

export default BaseEditor;
