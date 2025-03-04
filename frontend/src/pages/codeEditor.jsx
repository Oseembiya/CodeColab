import * as monaco from "@monaco-editor/react";
import { useState } from "react";

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
          defaultValue="// Start coding here"
          theme="vs-dark"
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
