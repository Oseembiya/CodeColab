import * as monaco from "@monaco-editor/react";
import { useState, useRef } from "react";
import { FaPlay, FaCheck } from "react-icons/fa";

const MonacoEditor = () => {
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);
  const editorRef = useRef(null);

  const languages = [
    { id: "javascript", name: "JavaScript" },
    { id: "python", name: "Python" },
    { id: "java", name: "Java" },
    { id: "cpp", name: "C++" },
    { id: "csharp", name: "C#" },
    { id: "go", name: "Go" },
    { id: "kotlin", name: "Kotlin" },
  ];

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const handleRunCode = async () => {
    const code = editorRef.current.getValue();
    setOutput("Running code...");
    
    try {
      // For demonstration, we'll use a simple evaluation
      // In a real application, you'd want to use a proper code execution service
      const result = await evaluateCode(code, language);
      setOutput(result);
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    }
  };

  const handleCheckAnswer = () => {
    const code = editorRef.current.getValue();
    // This is a simple example - you'd want to implement proper code validation
    const isAnswerCorrect = validateCode(code);
    setIsCorrect(isAnswerCorrect);
  };

  const evaluateCode = async (code, language) => {
    // This is a mock implementation
    // In a real application, you'd want to use a proper code execution service
    // like Judge0, CodeX, or your own backend service
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("Code executed successfully!");
      }, 1000);
    });
  };

  const validateCode = (code) => {
    // This is a mock implementation
    // In a real application, you'd want to implement proper code validation
    // based on your requirements
    return code.includes("function") && code.includes("return");
  };

  return (
    <div className="editor-container">
      <div className="editor-header">
        <div className="editor-buttons">
          <button 
            className="run-button"
            onClick={handleRunCode}
          >
            <FaPlay /> Run
          </button>
          <button 
            className={`check-button ${isCorrect !== null ? (isCorrect ? 'correct' : 'incorrect') : ''}`}
            onClick={handleCheckAnswer}
          >
            <FaCheck /> Check Answer
          </button>
        </div>
        <select
          value={language}
          onChange={handleLanguageChange}
          className="languages-select"
        >
          {languages.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className="monaco-editor">
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
      
      {output && (
        <div className="output-container">
          <h3>Output:</h3>
          <pre>{output}</pre>
        </div>
      )}
    </div>
  );
};

export default MonacoEditor;
