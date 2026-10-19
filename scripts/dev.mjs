import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['--import', 'tsx', 'src/server/index.ts'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' }),
];
let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
process.on('SIGINT', () => close());
process.on('SIGTERM', () => close());
for (const child of children) child.on('exit', code => close(code ?? 1));
