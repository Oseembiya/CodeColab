// Language configuration with boilerplate code and proper IDs
const languages = {
  javascript: {
    id: 63,
    name: "JavaScript (Node.js 12.14.0)",
    boilerplate: "// Your JavaScript code here\n\n",
    defaultCode: 'console.log("Hello, World!");',
  },
  python: {
    id: 71,
    name: "Python (3.8.1)",
    boilerplate: "# Your Python code here\n\n",
    defaultCode: 'print("Hello, World!")',
  },
  java: {
    id: 62,
    name: "Java (OpenJDK 13.0.1)",
    boilerplate: `public class Main {
    public static void main(String[] args) {
        // Your Java code here
        
    }
}\n`,
    defaultCode: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
  },
  cpp: {
    id: 54,
    name: "C++ (GCC 9.2.0)",
    boilerplate: `#include <iostream>
using namespace std;

int main() {
    // Your C++ code here
    
    return 0;
}\n`,
    defaultCode: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
  },
  c: {
    id: 50,
    name: "C (GCC 9.2.0)",
    boilerplate: `#include <stdio.h>

int main() {
    // Your C code here
    
    return 0;
}\n`,
    defaultCode: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
  },
  csharp: {
    id: 51,
    name: "C# (Mono 6.6.0.161)",
    boilerplate: `using System;

class Program {
    static void Main(string[] args) {
        // Your C# code here
        
    }
}\n`,
    defaultCode: `using System;

class Program {
    static void Main(string[] args) {
        Console.WriteLine("Hello, World!");
    }
}`,
  },
};

export const getDefaultCode = (language) => {
  return languages[language]?.defaultCode || "// Start coding here";
};

export const getBoilerplate = (language) => {
  return languages[language]?.boilerplate || "// Start coding here";
};

export const getLanguageId = (language) => {
  return languages[language]?.id;
};

export const getLanguageName = (language) => {
  return languages[language]?.name;
};

export const getSupportedLanguages = () => {
  return Object.entries(languages).map(([key, value]) => ({
    id: key,
    name: value.name,
  }));
};

export const executeCode = async (code, language = "javascript") => {
  const languageId = getLanguageId(language);
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  // Add proper wrapping for certain languages
  let processedCode = code;
  if (language === "java" && !code.includes("class Main")) {
    processedCode = `
public class Main {
    public static void main(String[] args) {
        ${code}
    }
}`;
  }

  try {
    // Create submission
    const submissionResponse = await fetch(
      "/judge0/submissions?base64_encoded=false&wait=false",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          "X-RapidAPI-Key": import.meta.env.VITE_RAPIDAPI_KEY,
        },
        body: JSON.stringify({
          source_code: processedCode,
          language_id: languageId,
          stdin: "",
          cpu_time_limit: 5,
          memory_limit: 512000,
        }),
      }
    );

    if (!submissionResponse.ok) {
      const error = await submissionResponse.json();
      throw new Error(error.message || "Failed to submit code");
    }

    const { token } = await submissionResponse.json();

    // Poll for results
    let result;
    let attempts = 0;
    const maxAttempts = 10;
    const pollInterval = 1000;

    while (attempts < maxAttempts) {
      const resultResponse = await fetch(
        `/judge0/submissions/${token}?base64_encoded=false`,
        {
          headers: {
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
            "X-RapidAPI-Key": import.meta.env.VITE_RAPIDAPI_KEY,
          },
        }
      );

      if (!resultResponse.ok) {
        throw new Error("Failed to fetch execution result");
      }

      result = await resultResponse.json();

      if (result.status?.id > 2) {
        return formatExecutionResult(result, language);
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;
    }

    throw new Error("Execution timed out");
  } catch (error) {
    console.error("Code execution error:", error);
    throw new Error(error.message || "Failed to execute code");
  }
};

const formatExecutionResult = (result, language) => {
  let output = "";

  // Add language-specific error handling
  switch (result.status?.id) {
    case 3: // Accepted
      return result.stdout || `Program executed successfully (no output)`;

    case 4: // Wrong Answer
      return `Wrong Answer\n${result.stdout || ""}`;

    case 5: // Time Limit Exceeded
      throw new Error(
        `Time limit exceeded. Your ${languages[language].name} code took too long to execute.`
      );

    case 6: // Compilation Error
      throw new Error(
        `Compilation error in ${languages[language].name}:\n${
          result.compile_output || ""
        }`
      );

    case 7: // Runtime Error (SIGSEGV)
      if (language === "cpp" || language === "c") {
        throw new Error(
          `Segmentation fault - check your memory access and pointers.`
        );
      }
      throw new Error(`Runtime error:\n${result.stderr || ""}`);

    case 8: // Runtime Error (SIGXFSZ)
      throw new Error(
        `Output limit exceeded - your program produced too much output.`
      );

    case 9: // Runtime Error (SIGFPE)
      throw new Error(
        `Floating point error - division by zero or similar issue.`
      );

    case 10: // Runtime Error (SIGABRT)
      throw new Error(`Program aborted - check for invalid operations.`);

    case 11: // Runtime Error (NZEC)
      if (language === "python") {
        throw new Error(
          `Python error:\n${result.stderr || "Non-zero exit code"}`
        );
      }
      throw new Error(
        `Program exited with non-zero code:\n${result.stderr || ""}`
      );

    case 12: // Runtime Error (Other)
      throw new Error(
        `Runtime error in ${languages[language].name}:\n${
          result.stderr || result.compile_output || "Unknown error"
        }`
      );

    default:
      throw new Error(
        `Unknown error occurred while running ${languages[language].name} code.`
      );
  }
};

export const statusCodes = {
  1: "In Queue",
  2: "Processing",
  3: "Accepted",
  4: "Wrong Answer",
  5: "Time Limit Exceeded",
  6: "Compilation Error",
  7: "Runtime Error (SIGSEGV)",
  8: "Runtime Error (SIGXFSZ)",
  9: "Runtime Error (SIGFPE)",
  10: "Runtime Error (SIGABRT)",
  11: "Runtime Error (NZEC)",
  12: "Runtime Error (Other)",
  13: "Internal Error",
  14: "Exec Format Error",
};
