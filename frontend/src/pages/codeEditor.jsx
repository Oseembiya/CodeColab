import * as monaco from "@monaco-editor/react";
import { useState, useRef } from "react";
import { FaPlay, FaCheck } from "react-icons/fa";

const MonacoEditor = () => {
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);
  const editorRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const languages = [
    { id: "javascript", name: "JavaScript" },
    { id: "python", name: "Python" },
    { id: "java", name: "Java" },
    { id: "cpp", name: "C++" },
    { id: "csharp", name: "C#" },
    { id: "go", name: "Go" },
    { id: "kotlin", name: "Kotlin" },
  ];

  // Language ID mapping for Judge0
  const languageIds = {
    javascript: 63,  // Node.js
    python: 71,      // Python 3
    java: 62,       // Java
    cpp: 54,        // C++
    csharp: 51,     // C#
    go: 60,         // Go
    kotlin: 78      // Kotlin
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const handleRunCode = async () => {
    const code = editorRef.current.getValue();
    setIsLoading(true);
    setOutput("Running code...");
    
    try {
      // Create submission
      const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          'X-RapidAPI-Key': '364315ccbdmshfca9834d3b458b0p1688e8jsn5a98fc87204d', // API key
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageIds[language],
          stdin: ''
        })
      });

      const { token } = await response.json();

      // Poll for results
      let result;
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

        const statusResponse = await fetch(`https://judge0-ce.p.rapidapi.com/submissions/${token}`, {
          headers: {
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
            'X-RapidAPI-Key': '364315ccbdmshfca9834d3b458b0p1688e8jsn5a98fc87204d' // Replace with your actual API key
          }
        });

        result = await statusResponse.json();

        if (result.status.id > 2) { // Status > 2 means processing is complete
          break;
        }
      }

      // Format and display results
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
    // This is a simple example - you'd want to implement proper code validation
    const isAnswerCorrect = validateCode(code);
    setIsCorrect(isAnswerCorrect);
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
            disabled={isLoading}
          >
            <FaPlay /> {isLoading ? 'Running...' : 'Run'}
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
