import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Language to docker image configuration mapping
const languageMap = {
  python: { image: 'compiler-python', fallbackImage: 'python:3.12-alpine', cmd: 'python', ext: '.py' },
  javascript: { image: 'compiler-js', fallbackImage: 'node:20-alpine', cmd: 'node', ext: '.js' },
  php: { image: 'compiler-php', fallbackImage: 'php:8.3-cli-alpine', cmd: 'php', ext: '.php' },
  java: { image: 'compiler-java', fallbackImage: 'eclipse-temurin:17-jdk', cmd: 'java', ext: '.java' },
  cpp: { image: 'compiler-cpp', fallbackImage: 'gcc:14', cmd: 'g++', ext: '.cpp' },
  'c++': { image: 'compiler-cpp', fallbackImage: 'gcc:14', cmd: 'g++', ext: '.cpp' },
  csharp: { image: 'compiler-csharp', fallbackImage: 'mcr.microsoft.com/dotnet/sdk:8.0', cmd: 'csc', ext: '.cs' },
  go: { image: 'compiler-go', fallbackImage: 'golang:1.22', cmd: 'go run', ext: '.go' },
  ruby: { image: 'compiler-ruby', fallbackImage: 'ruby:3.3-alpine', cmd: 'ruby', ext: '.rb' },
  rust: { image: 'compiler-rust', fallbackImage: 'rust:1.77', cmd: 'rustc', ext: '.rs' },
  swift: { image: 'compiler-swift', fallbackImage: 'swift:5.10', cmd: 'swift', ext: '.swift' },
  'c#': { image: 'compiler-csharp', fallbackImage: 'mcr.microsoft.com/dotnet/sdk:8.0', cmd: 'csc', ext: '.cs' },
};

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

function normalizeDockerVolumePath(hostPath = '') {
  // Docker on Windows handles forward slashes in bind paths more consistently.
  return process.platform === 'win32' ? hostPath.replace(/\\/g, '/') : hostPath;
}

function getJavaMainClassName(source = '') {
  const match = source.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/);
  return match ? match[1] : 'Main';
}

function runCode(langConfig, code, input = '') {
  return new Promise((resolve, reject) => {
    // Generate a temporary file with source code
    const tmpDir = os.tmpdir();
    const filename = langConfig.image === 'compiler-java'
      ? `${getJavaMainClassName(code)}${langConfig.ext}`
      : `code_${Date.now()}${langConfig.ext}`;
    const tmpFile = path.join(tmpDir, filename);
    fs.writeFileSync(tmpFile, code);

    // Map compiler commands to work within the container
    let containerCmd = '';
    const containerWorkdir = '/app';
    const compiledOutput = `main_${Date.now()}`;

    switch (langConfig.image) {
      case 'compiler-python':
      case 'compiler-js':
      case 'compiler-php':
      case 'compiler-ruby':
      case 'compiler-swift':
        containerCmd = `${langConfig.cmd} ${filename}`;
        break;
      case 'compiler-go':
        containerCmd = `go run ${filename}`;
        break;
      case 'compiler-cpp':
        containerCmd = `g++ ${filename} -o ${compiledOutput} && ./${compiledOutput}`;
        break;
      case 'compiler-java':
        containerCmd = `javac ${filename} && java ${path.basename(filename, '.java')}`;
        break;
      case 'compiler-rust':
        containerCmd = `rustc ${filename} -o ${compiledOutput} && ./${compiledOutput}`;
        break;
      case 'compiler-csharp':
        // The official .NET SDK image doesn't expose 'csc' or 'mono' by default
        // We can create a quick temporary console project, replace Program.cs with the code, and run it
        containerCmd = `mkdir -p ${compiledOutput} && cd ${compiledOutput} && dotnet new console --force > /dev/null && cp ../${filename} Program.cs && dotnet run`;
        break;
      default:
        containerCmd = `${langConfig.cmd} ${filename}`;
    }

    // Windows to Docker Desktop Volume mapping workaround requires formatting
    // If running in WSL or native Linux, it works as is. For strict Docker:
    const volumePath = normalizeDockerVolumePath(tmpDir);

    const executeOnImage = (imageName) => new Promise((resolveExecution, rejectExecution) => {
      const child = spawn('docker', [
        'run',
        '--rm',
        '-i',
        '--network', 'none', // Security: block internet access
        '-v', `${volumePath}:${containerWorkdir}`,
        '-w', containerWorkdir,
        imageName,
        'sh', '-c', containerCmd
      ], { timeout: 15000 });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode, signal) => {
        resolveExecution({
          stdout,
          stderr,
          exitCode: exitCode ?? 0,
          signal: signal ?? null,
          imageUsed: imageName,
        });
      });

      child.on('error', (error) => {
        if (error && error.code === 'ENOENT') {
          rejectExecution(new Error('Docker is not installed or not available in PATH.'));
          return;
        }
        rejectExecution(error);
      });

      if (input) {
        child.stdin.write(input.endsWith('\n') ? input : `${input}\n`);
      }

      child.stdin.end();
    });

    (async () => {
      try {
        const firstAttempt = await executeOnImage(langConfig.image);
        const imageNotFound = firstAttempt.exitCode === 125 &&
          (firstAttempt.stderr.includes('pull access denied') ||
          firstAttempt.stderr.includes('repository does not exist') ||
          firstAttempt.stderr.includes('requested access to the resource is denied'));

        if (imageNotFound && langConfig.fallbackImage) {
          const secondAttempt = await executeOnImage(langConfig.fallbackImage);
          resolve(secondAttempt);
          return;
        }

        resolve(firstAttempt);
      } catch (error) {
        reject(error);
      } finally {
        try { fs.unlinkSync(tmpFile); } catch (_) {}
      }
    })();
  });
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

    const runner = languageMap[language.toLowerCase()];
    if (!runner) {
      return res.status(400).json({ error: `Unsupported language: ${language}. Supported: ${Object.keys(languageMap).join(', ')}` });
    }

    const hasVisibleTests = Array.isArray(testCases) && testCases.length > 0;

    if (hasVisibleTests) {
      const results = [];

      for (const testCase of testCases) {
        const execution = await runCode(runner, code, testCase.input || '');
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
          error: hasRuntimeError ? errorMessage || `Process exited with code ${execution.exitCode}` : null,
        });

        if (hasRuntimeError) {
          break;
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

    const execution = await runCode(runner, code, input);
    const output = normalizeTextOutput(execution.stdout);
    const error = normalizeTextOutput(execution.stderr);

    if (execution.exitCode !== 0 || error) {
      return res.status(400).json({
        error: error || `Process exited with code ${execution.exitCode}`,
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