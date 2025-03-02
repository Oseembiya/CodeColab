import * as monaco from '@monaco-editor/react';

const MonacoEditor = () => {
  return (
    <div className="monaco-editor">
      <monaco.Editor
        height="100%"
        defaultLanguage="javascript"
        defaultValue="// Start coding here"
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          automaticLayout: true,
        }}
      />
    </div>
  );
};

export default MonacoEditor;