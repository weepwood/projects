import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** Runtime cache directory; everything here is disposable and gitignored. */
export const CACHE_DIR = path.join(ROOT, '.cache');

export function fromRoot(...parts) {
  return path.join(ROOT, ...parts);
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(fromRoot(file), 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(file, value) {
  const target = fromRoot(file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

export function exists(file) {
  return fs.existsSync(fromRoot(file));
}

/**
 * Read a required input. Failure explains what to run next instead of
 * throwing a bare ENOENT stack at the user.
 */
export function requireJson(file, hint) {
  if (!exists(file)) {
    const error = new Error(`缺少 ${file}，请先运行 \`${hint}\``);
    error.code = 'MISSING_INPUT';
    throw error;
  }
  try {
    return JSON.parse(fs.readFileSync(fromRoot(file), 'utf8'));
  } catch (cause) {
    const error = new Error(`${file} 不是合法 JSON：${cause.message}`);
    error.code = 'INVALID_INPUT';
    throw error;
  }
}

export function readText(file, fallback = '') {
  try {
    return fs.readFileSync(fromRoot(file), 'utf8');
  } catch {
    return fallback;
  }
}
