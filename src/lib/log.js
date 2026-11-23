const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const THRESHOLD = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function emit(level, scope, message) {
  if (LEVELS[level] < THRESHOLD) return;
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  stream.write(`[${level}] ${scope ? `${scope} ` : ''}${message}\n`);
}

export function createLogger(scope) {
  return {
    debug: (message) => emit('debug', scope, message),
    info: (message) => emit('info', scope, message),
    warn: (message) => emit('warn', scope, message),
    error: (message) => emit('error', scope, message),
    time(label) {
      const started = Date.now();
      return () => `${label} ${Date.now() - started}ms`;
    },
  };
}
