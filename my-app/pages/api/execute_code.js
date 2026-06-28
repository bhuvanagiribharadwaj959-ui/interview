function normalizeTextOutput(value = '') {
  return value.replace(/\r\n/g, '\n').trim();
}

function outputsMatch(actualOutput = '', expectedOutput = '') {
  const actual = normalizeTextOutput(actualOutput);
  const expected = normalizeTextOutput(expectedOutput);

  if (actual === expected) {
    return true;
  }

  const actualNumbers = actual.match(/-?\d+(?:\.\d+)?/g) || [];
  const expectedNumbers = expected.match(/-?\d+(?:\.\d+)?/g) || [];

  return actualNumbers.length > 0 &&
    actualNumbers.length === expectedNumbers.length &&
    actualNumbers.every((value, index) => value === expectedNumbers[index]);
}

// Judge0 Language IDs (Modern versions)
const languageMap = {
  python: 100,      // Python (3.12.5)
  javascript: 102,  // Node.js (22.08.0)
  php: 98,          // PHP (8.3.11)
  java: 91,         // Java (JDK 17.0.6)
  cpp: 105,         // C++ (GCC 14.1.0)
  'c++': 105,
  c: 103,           // C (GCC 14.1.0)
  csharp: 51,       // C# (Mono)
  'c#': 51,
  go: 107,          // Go (1.23.5)
  ruby: 72,         // Ruby (2.7.0)
  rust: 108,        // Rust (1.85.0)
  swift: 83,        // Swift (5.2.3)
  typescript: 101   // TypeScript (5.6.2)
};

async function runOnJudge0(languageId, code, input) {
  const url = `https://ce.judge0.com/submissions?base64_encoded=false&wait=true`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source_code: code,
      language_id: languageId,
      stdin: input || ""
    })
  });

  if (!response.ok) {
    throw new Error(`Judge0 API responded with status: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.message && !result.status) {
    throw new Error(result.message);
  }

  // Judge0 status ids: 3 is Accepted. Anything else (like compilation error, runtime error) has error output
  const hasError = result.status && result.status.id !== 3;

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || result.compile_output || '',
    exitCode: hasError ? 1 : 0,
    signal: null
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { language, code, input = '', testCases = [] } = req.body || {};

    if (!language || !code) {
      return res.status(400).json({ error: 'Language and code are required.' });
    }

    const langConfig = languageMap[language.toLowerCase()];
    if (!langConfig) {
      return res.status(400).json({ error: `Unsupported language: ${language}. Supported: ${Object.keys(languageMap).join(', ')}` });
    }

    const hasVisibleTests = Array.isArray(testCases) && testCases.length > 0;

    if (hasVisibleTests) {
      const results = [];

      for (const testCase of testCases) {
        const execution = await runOnJudge0(langConfig, code, testCase.input || '');
        const actualOutput = normalizeTextOutput(execution.stdout);
        const expectedOutput = normalizeTextOutput(testCase.expectedOutput || '');
        const errorMessage = normalizeTextOutput(execution.stderr);
        const hasRuntimeError = execution.exitCode !== 0 || Boolean(errorMessage);

        results.push({
          id: testCase.id,
          name: testCase.name,
          input: testCase.input || '',
          expectedOutput,
          actualOutput,
          passed: !hasRuntimeError && outputsMatch(actualOutput, expectedOutput),
          error: hasRuntimeError ? errorMessage || `Process exited with error` : null,
        });

        if (hasRuntimeError) {
          break; // Stop running test cases if compilation or runtime fails
        }
      }

      const passedCount = results.filter((result) => result.passed).length;
      const failedCount = results.length - passedCount;
      const runtimeError = results.find((result) => result.error);

      return res.status(200).json({
        status: runtimeError ? 'runtime-error' : failedCount > 0 ? 'wrong-answer' : 'accepted',
        output: results.at(-1)?.actualOutput || '',
        executionError: runtimeError?.error || null,
        passedCount,
        failedCount,
        totalCount: testCases.length,
        hasHiddenTestCases: false,
        results,
      });
    }

    // Run custom input execution
    const execution = await runOnJudge0(langConfig, code, input);
    const output = normalizeTextOutput(execution.stdout);
    const error = normalizeTextOutput(execution.stderr);

    if (execution.exitCode !== 0 || error) {
      return res.status(400).json({
        error: error || `Process exited with an error.`,
        output,
      });
    }

    return res.status(200).json({ output });
  } catch (err) {
    console.error('execute_code error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err && err.message ? err.message : 'Execution error' });
    }
  }
}