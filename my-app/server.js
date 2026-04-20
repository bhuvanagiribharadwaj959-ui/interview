import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dev = process.env.NODE_ENV !== 'production';
if (dev) {
  // Turbopack + custom servers can intermittently fail with missing dev manifests.
  // Force webpack dev pipeline for stability in this project.
  process.env.NEXT_DISABLE_TURBOPACK = process.env.NEXT_DISABLE_TURBOPACK || '1';
  process.env.TURBOPACK = process.env.TURBOPACK || '0';

  // Recover automatically from corrupted Next.js dev caches.
  const nextDevDir = path.join(__dirname, '.next', 'dev');
  if (process.env.CLEAN_NEXT_DEV_CACHE !== '0') {
    try {
      fs.rmSync(nextDevDir, { recursive: true, force: true });
    } catch (err) {
      console.warn('Failed to clean .next/dev cache:', err?.message || err);
    }
  }
}
// Pin Next.js to this project directory to avoid cwd/workspace root ambiguity.
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

// Language to runner file mapping
const languageMap = {
  python: 'python.js',
  javascript: 'javascript.js',
  php: 'php.js',
  java: 'java.js',
  cpp: 'cpp.js',
  'c++': 'cpp.js',
  go: 'go.js',
  ruby: 'ruby.js',
  rust: 'rust.js',
  swift: 'swift.js',
  'c#': 'csharp.js',
};

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  const lspWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url);

    if (pathname === '/api/execute') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else if (pathname === '/api/lsp') {
      lspWss.handleUpgrade(req, socket, head, (ws) => {
        lspWss.emit('connection', ws, req);
      });
    }
  });

  // LSP Server connection handler (Pyright for Python)
  lspWss.on('connection', (ws) => {
    console.log('LSP client connected');

    // For simplistic implementation, we spawn pyright.
    // In production, we'd handle language selection via query param (?lang=python).
    const lspProcess = spawn('npx', ['pyright-langserver', '--stdio'], {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Pipe WebSocket to Pyright stdin
    ws.on('message', (message) => {
      if (lspProcess.stdin.writable) {
        // Ensure message is handled correctly whether it's a string, Buffer, or ArrayBuffer
        const data = Buffer.isBuffer(message) ? message : Buffer.from(message);
        lspProcess.stdin.write(data);
      }
    });

    // Pipe Pyright stdout to WebSocket
    lspProcess.stdout.on('data', (data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    });

    // Logging errors
    lspProcess.stderr.on('data', (data) => {
      // console.error(`LSP stderr: ${data}`); // Optional: noise reduction
    });

    ws.on('close', () => {
      console.log('LSP client disconnected');
      lspProcess.kill();
    });

    lspProcess.on('exit', (code) => {
      console.log(`LSP process exited with code ${code}`);
      ws.close();
    });

    lspProcess.on('error', (err) => {
      console.error('LSP process error:', err);
      ws.close();
    });
  });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    let currentProcess = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        if (data.type === 'execute') {
          const { language, code } = data;

          if (!language || !code) {
            ws.send(JSON.stringify({ type: 'error', message: 'Language and code are required.' }));
            return;
          }

          const runner = languageMap[language.toLowerCase()];
          if (!runner) {
            ws.send(JSON.stringify({ type: 'error', message: `Unsupported language: ${language}` }));
            return;
          }

          const runnerPath = path.join(__dirname, 'my-compiler', runner);
          if (!fs.existsSync(runnerPath)) {
            ws.send(JSON.stringify({ type: 'error', message: `Runner not found for language: ${language}` }));
            return;
          }

          // Kill any existing process
          if (currentProcess) {
            currentProcess.kill();
          }

          // Spawn the process
          currentProcess = spawn('node', [runnerPath, code], {
            timeout: 30000,
            stdio: ['pipe', 'pipe', 'pipe']
          });

          ws.send(JSON.stringify({ type: 'status', message: 'Code execution started...' }));

          // Handle stdout
          currentProcess.stdout.on('data', (data) => {
            const output = data.toString();
            ws.send(JSON.stringify({ type: 'output', data: output }));
          });

          // Handle stderr
          currentProcess.stderr.on('data', (data) => {
            const error = data.toString();
            ws.send(JSON.stringify({ type: 'stderr', data: error }));
          });

          // Handle process exit
          currentProcess.on('close', (code) => {
            ws.send(JSON.stringify({ type: 'status', message: `Process exited with code ${code}` }));
            currentProcess = null;
          });

          currentProcess.on('error', (err) => {
            ws.send(JSON.stringify({ type: 'error', data: err.message }));
            currentProcess = null;
          });
        } 
        else if (data.type === 'input') {
          // User input from terminal
          if (currentProcess && !currentProcess.killed) {
            const inputStr = data.data;
            currentProcess.stdin.write(inputStr + '\n');
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
        ws.send(JSON.stringify({ type: 'error', data: err.message }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      if (currentProcess && !currentProcess.killed) {
        currentProcess.kill();
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  });

  const maxPortAttempts = 10;
  let currentPort = Number(process.env.PORT || 3000);
  let attempts = 0;

  const listenOnCurrentPort = () => {
    server.listen(currentPort, () => {
      console.log(`> Ready on http://localhost:${currentPort}`);
    });
  };

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && attempts < maxPortAttempts) {
      attempts += 1;
      const previousPort = currentPort;
      currentPort += 1;
      console.warn(`Port ${previousPort} is in use, retrying on ${currentPort}...`);
      listenOnCurrentPort();
      return;
    }

    if (err && err.code === 'EADDRINUSE') {
      console.error(`No available port found after ${maxPortAttempts + 1} attempts starting at ${Number(process.env.PORT || 3000)}.`);
    } else {
      console.error('Server startup error:', err);
    }

    process.exit(1);
  });

  listenOnCurrentPort();
});
