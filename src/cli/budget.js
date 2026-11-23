#!/usr/bin/env node
/**
 * Size budget, enforced in CI so a "quick" inline payload cannot creep back in.
 * Limits are gzipped HTML per page plus the shipped CSS bundle.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { ROOT } from '../lib/fsx.js';
import { createLogger } from '../lib/log.js';

const log = createLogger('budget');

// The dashboard carries what used to be four separate pages (featured work,
// the full catalog, health mix, recent transitions, 180-day history), so its
// budget is larger than a single-purpose page. It is still one gzipped request.
const BUDGETS = {
  'index.html': 22_000,
  'catalog/index.html': 20_000,
  'status/index.html': 12_000,
  'history/index.html': 12_000,
};
const CSS_BUDGET = 15_000;
const JS_BUDGET = 6_000;

const dist = path.join(ROOT, 'dist');
if (!fs.existsSync(dist)) {
  log.error('dist/ 不存在，请先运行 npm run build');
  process.exit(1);
}

const gz = (buffer) => zlib.gzipSync(buffer).length;
const failures = [];
const rows = [];

for (const [file, budget] of Object.entries(BUDGETS)) {
  const target = path.join(dist, file);
  if (!fs.existsSync(target)) {
    failures.push(`缺少产物 ${file}`);
    continue;
  }
  const size = gz(fs.readFileSync(target));
  rows.push({ file, size, budget });
  if (size > budget) failures.push(`${file} 超出预算：${size} B > ${budget} B`);
}

const assetDir = path.join(dist, 'assets');
const assetFiles = fs.existsSync(assetDir)
  ? fs.readdirSync(assetDir).filter((file) => fs.statSync(path.join(assetDir, file)).isFile())
  : [];

for (const file of assetFiles) {
  const size = gz(fs.readFileSync(path.join(assetDir, file)));
  if (file.endsWith('.css')) {
    rows.push({ file: `assets/${file}`, size, budget: CSS_BUDGET });
    if (size > CSS_BUDGET) failures.push(`CSS 超出预算：${file} ${size} B > ${CSS_BUDGET} B`);
  }
  if (file.endsWith('.js') && file.includes('catalog')) {
    rows.push({ file: `assets/${file}`, size, budget: JS_BUDGET });
    if (size > JS_BUDGET) failures.push(`客户端脚本超出预算：${file} ${size} B > ${JS_BUDGET} B`);
  }
}

// Measures the number a visitor actually transfers (gzip), not raw bytes.
const table = rows.map((row) => {
  const ratio = ((row.size / row.budget) * 100).toFixed(0);
  return `${row.file.padEnd(28)} ${String(row.size).padStart(6)} B / ${row.budget} B  ${ratio}%`;
});
log.info(`\n${table.join('\n')}`);

if (failures.length) {
  for (const failure of failures) log.error(failure);
  process.exit(1);
}

log.info('体积预算通过');
