import { useState } from 'react';
import BaseEditor from './BaseEditor';
import { executeCode } from '../../services/codeExecution';

const SoloEditor = () => {
  const [language, setLanguage] = useState('javascript');

  const handleRunCode = async (code) => {
    const result = await executeCode(code, language);
    return result;
  };

  const handleCheckAnswer = async (code) => {
    // Implement answer checking logic
  };

  return (
    <BaseEditor
      language={language}
      onLanguageChange={(e) => setLanguage(e.target.value)}
      onRunCode={handleRunCode}
      showCheckAnswer={true}
      onCheckAnswer={handleCheckAnswer}
    />
  );
};

export default SoloEditor; 