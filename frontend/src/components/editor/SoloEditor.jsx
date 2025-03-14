import { useState } from 'react';
import BaseEditor from './BaseEditor';
import { executeCode } from '../../services/codeExecution';

const SoloEditor = () => {
  const [language, setLanguage] = useState('javascript');

  const handleRunCode = async (code) => {
    try {
      const result = await executeCode(code, language);
      return result;
    } catch (error) {
      console.error('Code execution error:', error);
      throw error;
    }
  };

  return (
    <BaseEditor
      language={language}
      onLanguageChange={setLanguage}
      onRunCode={handleRunCode}
      showCheckAnswer={true}
    />
  );
};

export default SoloEditor; 