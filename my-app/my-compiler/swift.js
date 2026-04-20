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
  const tmpFile = path.join(tmpDir, `code_${Date.now()}.swift`);
  fs.writeFileSync(tmpFile, code);

  const swift = spawn('swift', [tmpFile]);
  
  swift.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  swift.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  swift.on('close', (code) => {
    try {
      fs.unlinkSync(tmpFile);
    } catch (_) {}
    process.exit(code || 0);
  });

  process.stdin.pipe(swift.stdin);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
