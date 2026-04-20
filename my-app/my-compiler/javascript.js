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
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `code_${Date.now()}.js`);
  fs.writeFileSync(tmpFile, code);

  const node = spawn('node', [tmpFile]);
  
  node.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  node.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  node.on('close', (code) => {
    try {
      fs.unlinkSync(tmpFile);
    } catch (_) {}
    process.exit(code || 0);
  });

  process.stdin.pipe(node.stdin);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
