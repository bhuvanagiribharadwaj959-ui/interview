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

// Glot.io Language Names and Filenames
const languageMap = {
  python: { lang: 'python', filename: 'main.py' },
  javascript: { lang: 'javascript', filename: 'main.js' },
  php: { lang: 'php', filename: 'main.php' },
  java: { lang: 'java', filename: 'Main.java' },
  cpp: { lang: 'cpp', filename: 'main.cpp' },
  'c++': { lang: 'cpp', filename: 'main.cpp' },
  csharp: { lang: 'csharp', filename: 'main.cs' },
  'c#': { lang: 'csharp', filename: 'main.cs' },
  go: { lang: 'go', filename: 'main.go' },
  ruby: { lang: 'ruby', filename: 'main.rb' },
  rust: { lang: 'rust', filename: 'main.rs' },
  swift: { lang: 'swift', filename: 'main.swift' }
};

async function runOnGlot(langConfig, code, input) {
  const url = `https://run.glot.io/languages/${langConfig.lang}/latest`;
  const token = process.env.GLOT_API_TOKEN;

  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      files: [{ name: langConfig.filename, content: code }],
      stdin: input || ""
    })
  });

  if (!response.ok) {
    throw new Error(`Glot.io API responded with status: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.message) {
    throw new Error(result.message);
  }

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || result.error || '',
    exitCode: (result.stderr || result.error) ? 1 : 0,
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
        const execution = await runOnGlot(langConfig, code, testCase.input || '');
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
    const execution = await runOnGlot(langConfig, code, input);
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