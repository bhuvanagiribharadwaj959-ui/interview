#!/usr/bin/env node
import { spawn, execSync } from 'child_process';
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
  const tmpFile = path.join(tmpDir, `code_${Date.now()}.cpp`);
  const exeName = path.join(tmpDir, `code_${Date.now()}.exe`);
  fs.writeFileSync(tmpFile, code);

  execSync(`g++ -o "${exeName}" "${tmpFile}"`, { stdio: 'inherit' });
  const exe = spawn(exeName);
  
  exe.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  exe.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  exe.on('close', (code) => {
    try {
      fs.unlinkSync(tmpFile);
      fs.unlinkSync(exeName);
    } catch (_) {}
    process.exit(code || 0);
  });

  process.stdin.pipe(exe.stdin);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
