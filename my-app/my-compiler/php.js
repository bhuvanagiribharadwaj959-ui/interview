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
  const tmpFile = path.join(tmpDir, `code_${Date.now()}.php`);
  fs.writeFileSync(tmpFile, code);

  const php = spawn('php', [tmpFile]);
  
  php.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  php.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  php.on('close', (code) => {
    try {
      fs.unlinkSync(tmpFile);
    } catch (_) {}
    process.exit(code || 0);
  });

  process.stdin.pipe(php.stdin);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
