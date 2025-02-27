import * as monaco from '@monaco-editor/react';

const MonacoEditor = () => {
  return (
    <monaco.Editor
      height="100vh"
      defaultLanguage="javascript"
      defaultValue="// Start coding here"
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        automaticLayout: true,
      }}
    />
  );
};

export default MonacoEditor;