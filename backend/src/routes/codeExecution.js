const express = require("express");
const router = express.Router();
const axios = require("axios");

// Add axios to package.json dependencies
// npm install axios

const JUDGE0_API_URL =
  process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

router.post("/execute", async (req, res) => {
  try {
    const { code, language } = req.body;

    // Map frontend language to Judge0 language ID
    const languageId = mapLanguageToJudge0Id(language);

    // Submit code to Judge0
    const submission = await axios.post(
      `${JUDGE0_API_URL}/submissions`,
      {
        source_code: code,
        language_id: languageId,
        stdin: req.body.stdin || "",
      },
      {
        headers: {
          "X-RapidAPI-Key": JUDGE0_API_KEY,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          "Content-Type": "application/json",
        },
      }
    );

    // Get submission token
    const token = submission.data.token;

    // Wait for execution to complete
    let result;
    let attempts = 0;

    do {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
      result = await axios.get(`${JUDGE0_API_URL}/submissions/${token}`, {
        headers: {
          "X-RapidAPI-Key": JUDGE0_API_KEY,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
      });
      attempts++;
    } while (result.data.status.id <= 2 && attempts < 10); // Processing or In Queue

    res.json(result.data);
  } catch (error) {
    console.error("Code execution error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to execute code",
    });
  }
});

// Helper function to map frontend languages to Judge0 language IDs
function mapLanguageToJudge0Id(language) {
  const languageMap = {
    javascript: 63, // JavaScript Node.js
    python: 71, // Python 3
    java: 62, // Java
    cpp: 54, // C++
    csharp: 51, // C#
  };

  return languageMap[language] || 63; // Default to JavaScript
}

module.exports = router;
