import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * `npm test` needs to run two independent suites:
 *   1. vitest (jsdom/component/integration tests)
 *   2. node's built-in test runner, for the plain `node:test`-based
 *      `*.test.mjs` files under src/ that vitest.config.js explicitly
 *      excludes (see that file's `exclude` array for why).
 *
 * A plain `"vitest run && node --test ..."` shell chain is unsafe here: on
 * Windows npm scripts run through cmd.exe, and `&&` only runs the second
 * command if the first exits 0. This repo has one pre-existing, unrelated
 * vitest failure (see final-review-fix-report.md), so vitest already exits
 * non-zero — which would silently skip the node:test suite every single
 * run, defeating the point of adding it as a regression guard. Running both
 * from a real script (argv passed directly to spawnSync, no shell
 * involved) sidesteps both that chaining pitfall and any cross-shell glob
 * differences between cmd.exe / PowerShell / bash.
 */
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const vitest = spawnSync('npx', ['vitest', 'run'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
});

const nodeTest = spawnSync(
  process.execPath,
  ['--test', 'src/**/*.test.mjs'],
  { cwd: projectRoot, stdio: 'inherit' }
);

const vitestExitCode = vitest.status ?? 1;
const nodeTestExitCode = nodeTest.status ?? 1;

if (vitestExitCode !== 0 || nodeTestExitCode !== 0) {
  process.exit(vitestExitCode !== 0 ? vitestExitCode : nodeTestExitCode);
}

process.exit(0);
