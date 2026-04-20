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
  const tmpFile = path.join(tmpDir, `code_${Date.now()}.rb`);
  fs.writeFileSync(tmpFile, code);

  const ruby = spawn('ruby', [tmpFile]);
  
  ruby.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  ruby.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  ruby.on('close', (code) => {
    try {
      fs.unlinkSync(tmpFile);
    } catch (_) {}
    process.exit(code || 0);
  });

  process.stdin.pipe(ruby.stdin);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
