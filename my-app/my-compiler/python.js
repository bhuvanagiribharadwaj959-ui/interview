#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const code = process.argv[2];

if (!code) {
  console.error('No code provided');
  process.exit(1);
}

try {
  // Write code to a temporary file
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `code_${Date.now()}.py`);
  fs.writeFileSync(tmpFile, code);

  // Spawn python process with stdin from process.stdin
  const python = spawn('python', ['-u', tmpFile]);
  
  python.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  python.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  python.on('close', (code) => {
    try {
      fs.unlinkSync(tmpFile);
    } catch (_) {}
    process.exit(code || 0);
  });

  // Pipe stdin from parent process to child process
  process.stdin.pipe(python.stdin);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
