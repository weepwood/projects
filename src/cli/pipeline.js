#!/usr/bin/env node
/**
 * Local equivalent of the scheduled workflow, minus screenshot capture
 * (needs Chromium) and Issue sync (needs a token). Each step is its own
 * process so a failure names the step that broke.
 */
import { spawnSync } from 'node:child_process';
import { createLogger } from '../lib/log.js';

const log = createLogger('pipeline');
const steps = [
  ['enrich', ['src/cli/enrich.js']],
  ['health', ['src/cli/health.js']],
  ['build', ['node_modules/astro/astro.js', 'build']],
];

for (const [name, args] of steps) {
  const done = log.time(name);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    log.error(`步骤 ${name} 失败，已停止`);
    process.exit(result.status ?? 1);
  }
  log.info(done());
}

log.info('完成，产物在 dist/');
