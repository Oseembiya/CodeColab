const languageIds = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  csharp: 51
};

export const executeCode = async (code, language) => {
  const apiKey = import.meta.env.VITE_RAPIDAPI_KEY;
  
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  // Submit code
  const submitResponse = await fetch('https://judge0-ce.p.rapidapi.com/submissions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      'X-RapidAPI-Key': apiKey,
    },
    body: JSON.stringify({
      source_code: code,
      language_id: languageIds[language],
      stdin: ''
    })
  });

  if (!submitResponse.ok) {
    throw new Error(`API Error: ${submitResponse.status}`);
  }

  const { token } = await submitResponse.json();

  // Poll for results
  let result;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const statusResponse = await fetch(
      `https://judge0-ce.p.rapidapi.com/submissions/${token}`,
      {
        headers: {
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          'X-RapidAPI-Key': apiKey,
        }
      }
    );

    if (!statusResponse.ok) {
      throw new Error(`Status check failed: ${statusResponse.status}`);
    }

    result = await statusResponse.json();
    if (result.status.id > 2) break;
    attempts++;
  }

  // Format output
  return formatExecutionResult(result);
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