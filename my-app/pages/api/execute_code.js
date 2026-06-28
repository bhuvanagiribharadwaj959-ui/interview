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

// Piston Language Names
const languageMap = {
  python: 'python',
  javascript: 'javascript',
  php: 'php',
  java: 'java',
  cpp: 'c++',
  'c++': 'c++',
  csharp: 'csharp',
  'c#': 'csharp',
  go: 'go',
  ruby: 'ruby',
  rust: 'rust',
  swift: 'swift'
};

async function runOnPiston(languageId, code, input) {
  const url = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston/execute';
  const apiKey = process.env.PISTON_API_KEY;

  const headers = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    // Some piston instances use Authorization, others use x-api-key
    headers['Authorization'] = apiKey;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      language: languageId,
      version: '*',
      files: [{ content: code }],
      stdin: input || ""
    })
  });

  if (!response.ok) {
    throw new Error(`Piston API responded with status: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.message) {
    throw new Error(result.message);
  }

  return {
    stdout: result.run.stdout || '',
    stderr: result.run.stderr || result.compile?.stderr || '',
    exitCode: result.run.code || result.compile?.code || 0,
    signal: result.run.signal || null
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

    const langId = languageMap[language.toLowerCase()];
    if (!langId) {
      return res.status(400).json({ error: `Unsupported language: ${language}. Supported: ${Object.keys(languageMap).join(', ')}` });
    }

    const hasVisibleTests = Array.isArray(testCases) && testCases.length > 0;

    if (hasVisibleTests) {
      const results = [];

      for (const testCase of testCases) {
        const execution = await runOnPiston(langId, code, testCase.input || '');
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
    const execution = await runOnPiston(langId, code, input);
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