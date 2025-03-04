import * as monaco from "@monaco-editor/react";
import { useState } from "react";
import { FaPlay, FaCheck } from "react-icons/fa";


const MonacoEditor = () => {
  const [language, setLanguage] = useState("javascript");

  
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

  return (
    <div className="editor-container">
      <div className="editor-header">
        <div className="editor-buttons">
          <button className="run-button">
            <FaPlay /> Run
          </button>
          <button className="check-button">
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
    </div>
  );
};

export default MonacoEditor;
