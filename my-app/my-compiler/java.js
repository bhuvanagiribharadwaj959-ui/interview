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
  const runDir = path.join(tmpDir, `java_run_${Date.now()}`);
  fs.mkdirSync(runDir, { recursive: true });

  let className = 'Test';
  const match = code.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/) || code.match(/class\s+([A-Za-z_][A-Za-z0-9_]*)/);
  if (match) {
    className = match[1];
  }

  const tmpFile = path.join(runDir, `${className}.java`);
  const hasClassDef = match !== null;
  const wrappedCode = hasClassDef ? code : `public class ${className} { public static void main(String[] args) { ${code} } }`;
  fs.writeFileSync(tmpFile, wrappedCode);

  execSync(`javac "${tmpFile}"`, { stdio: 'inherit' });
  const java = spawn('java', ['-cp', runDir, className]);
  
  java.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  java.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  java.on('close', (code) => {
    try {
      fs.rmSync(runDir, { recursive: true, force: true });
    } catch (_) {}
    process.exit(code || 0);
  });

  process.stdin.pipe(java.stdin);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
