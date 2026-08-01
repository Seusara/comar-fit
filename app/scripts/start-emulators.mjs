import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const DATA_DIRECTORY = '.firebase-data';

export function buildEmulatorArgs(hasExport) {
  const args = [
    'emulators:start',
    '--only',
    'auth,firestore,functions',
    `--export-on-exit=${DATA_DIRECTORY}`,
  ];
  if (hasExport) args.push(`--import=${DATA_DIRECTORY}`);
  return args;
}

function startEmulators() {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const hasExport = existsSync(join(projectRoot, DATA_DIRECTORY, 'firebase-export-metadata.json'));
  const executable = process.platform === 'win32' ? 'firebase.cmd' : 'firebase';
  const result = spawnSync(executable, buildEmulatorArgs(hasExport), {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  process.exitCode = result.status ?? 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startEmulators();
}
