const languageIds = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  csharp: 51
};

const languageMap = {
  'javascript': 63,  // Node.js
  'python': 71,      // Python 3
  'java': 62,        // Java
  'cpp': 54,         // C++
  'csharp': 51       // C#
};

export const executeCode = async (code, language = 'javascript') => {
  const languageId = languageMap[language];
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  console.log('Executing code with language:', language, 'languageId:', languageId);

  try {
    // First, create a submission
    const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        'X-RapidAPI-Key': import.meta.env.VITE_RAPIDAPI_KEY
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin: ''
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to execute code');
    }

    const { token } = await response.json();

    // Wait for the result
    let result;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const resultResponse = await fetch(`https://judge0-ce.p.rapidapi.com/submissions/${token}`, {
        headers: {
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          'X-RapidAPI-Key': import.meta.env.VITE_RAPIDAPI_KEY
        }
      });

      if (!resultResponse.ok) {
        throw new Error('Failed to get execution result');
      }

      result = await resultResponse.json();

      if (result.status.id > 2) { // Status > 2 means processing is complete
        break;
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    // Handle different execution results
    switch (result.status.id) {
      case 3: // Accepted/Success
        return result.stdout || 'Program executed successfully (no output)';
      case 4: // Wrong Answer
        return result.stdout || 'Program executed but produced wrong answer';
      case 5: // Time Limit Exceeded
        throw new Error('Time limit exceeded');
      case 6: // Compilation Error
        throw new Error(`Compilation error:\n${result.compile_output}`);
      case 7: // Runtime Error (SIGSEGV)
        throw new Error(`Runtime error:\n${result.stderr}`);
      case 8: // Runtime Error (SIGXFSZ)
        throw new Error('Output limit exceeded');
      case 9: // Runtime Error (SIGFPE)
        throw new Error('Floating point error');
      case 10: // Runtime Error (SIGABRT)
        throw new Error('Aborted');
      case 11: // Runtime Error (NZEC)
        throw new Error('Runtime error');
      case 12: // Runtime Error (Other)
        throw new Error(`Runtime error:\n${result.stderr}`);
      default:
        throw new Error('Unknown error occurred');
    }
  } catch (error) {
    console.error('Code execution error:', error);
    throw error;
  }
};

const formatExecutionResult = (result) => {
  let output = '';
  
  if (result.status) {
    output += `Status: ${result.status.description}\n\n`;
  }

  if (result.stdout) {
    output += `Output:\n${result.stdout}\n`;
  }

  if (result.stderr) {
    output += `\nErrors:\n${result.stderr}\n`;
  }

  if (result.compile_output) {
    output += `\nCompilation Output:\n${result.compile_output}\n`;
  }

  output += `\nExecution Time: ${result.time || '0'} seconds`;
  output += `\nMemory Used: ${result.memory || '0'} KB`;

  return output;
}; 