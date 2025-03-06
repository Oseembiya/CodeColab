import * as monaco from "@monaco-editor/react";
import { useState, useRef, useEffect, useCallback } from "react";
import EditorToolbar from "../components/editor/EditorToolbar";
import OutputPanel from "../components/editor/OutputPanel";

const MonacoEditor = () => {
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);
  const editorRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [outputHeight, setOutputHeight] = useState(200);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const languages = [
    { id: "javascript", name: "JavaScript" },
    { id: "python", name: "Python" },
    { id: "java", name: "Java" },
    { id: "cpp", name: "C++" },
    { id: "csharp", name: "C#" },
    { id: "go", name: "Go" },
    { id: "kotlin", name: "Kotlin" },
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

  const handleLanguageChange = (e) => setLanguage(e.target.value);

  const handleRunCode = async () => {
    const code = editorRef.current.getValue();
    setIsLoading(true);
    setOutput("Running code...");
    
    try {
      const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          'X-RapidAPI-Key': '364315ccbdmshfca9834d3b458b0p1688e8jsn5a98fc87204d',
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageIds[language],
          stdin: ''
        })
      });

      const { token } = await response.json();

      let result;
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const statusResponse = await fetch(`https://judge0-ce.p.rapidapi.com/submissions/${token}`, {
          headers: {
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
            'X-RapidAPI-Key': '364315ccbdmshfca9834d3b458b0p1688e8jsn5a98fc87204d'
          }
        });

        result = await statusResponse.json();
        if (result.status.id > 2) break;
      }

      let outputText = '';
      if (result.stdout) outputText += `Output:\n${result.stdout}\n`;
      if (result.stderr) outputText += `\nErrors:\n${result.stderr}\n`;
      if (result.compile_output) outputText += `\nCompilation Output:\n${result.compile_output}\n`;
      outputText += `\nExecution Time: ${result.time || '0'} seconds`;
      outputText += `\nMemory Used: ${result.memory || '0'} KB`;

      setOutput(outputText);
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckAnswer = () => {
    const code = editorRef.current.getValue();
    setIsCorrect(code.includes("function") && code.includes("return"));
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = outputHeight;
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleDrag = useCallback((e) => {
    if (isDragging) {
      const delta = dragStartY.current - e.clientY;
      const newHeight = Math.min(Math.max(dragStartHeight.current + delta, 100), window.innerHeight - 200);
      setOutputHeight(newHeight);
    }
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
  }, [handleDrag]);

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartY.current = touch.clientY;
    dragStartHeight.current = outputHeight;
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleTouchMove = useCallback((e) => {
    if (isDragging) {
      e.preventDefault();
      const touch = e.touches[0];
      const delta = dragStartY.current - touch.clientY;
      const newHeight = Math.min(Math.max(dragStartHeight.current + delta, 100), window.innerHeight - 200);
      setOutputHeight(newHeight);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  }, [handleTouchMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleDrag, handleDragEnd, handleTouchMove, handleTouchEnd]);

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

      <div className="editor-main">
        <div className="monaco-editor-wrapper">
          <monaco.Editor
            key={language}
            height="100%"
            language={language}
            theme="vs-dark"
            defaultValue="// type your code here"
            onMount={(editor) => {
              editorRef.current = editor;
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              automaticLayout: true,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyond: false,
              readOnly: false,
              cursorStyle: 'line',
            }}
          />
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

export default MonacoEditor;
