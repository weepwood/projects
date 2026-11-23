import { readJson } from './fsx.js';

const DEFAULTS = {
  owner: 'weepwood',
  screenshotMinDays: 10,
  maxScreenshotsPerRun: 8,
  screenshotFailureRetryHours: 24,
  healthTimeoutMs: 12_000,
  healthConcurrency: 8,
  healthHistoryDays: 180,
  healthHistoryMaxEvents: 1000,
  enrichmentConcurrency: 5,
  exclude: [],
  overrides: {},
};

const NUMBER_KEYS = [
  'screenshotMinDays',
  'maxScreenshotsPerRun',
  'screenshotFailureRetryHours',
  'healthTimeoutMs',
  'healthConcurrency',
  'healthHistoryDays',
  'healthHistoryMaxEvents',
  'enrichmentConcurrency',
];

export function loadConfig(overrides = {}) {
  const raw = { ...DEFAULTS, ...readJson('automation.config.json', {}), ...overrides };
  const config = { ...raw };

  for (const key of NUMBER_KEYS) {
    const value = Number(config[key]);
    config[key] = Number.isFinite(value) && value > 0 ? value : DEFAULTS[key];
  }
  config.exclude = Array.isArray(config.exclude) ? config.exclude : [];
  config.overrides = config.overrides && typeof config.overrides === 'object' ? config.overrides : {};

  return config;
}

export { DEFAULTS };
