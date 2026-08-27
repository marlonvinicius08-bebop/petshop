const levels = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger(service, minimumLevel = 'info', output = console) {
  const threshold = levels[minimumLevel] ?? levels.info;

  function write(level, event, fields = {}) {
    if (levels[level] < threshold) return;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service,
      event,
      ...fields,
    };
    output[level === 'error' ? 'error' : 'log'](JSON.stringify(entry));
  }

  return {
    debug: (event, fields) => write('debug', event, fields),
    info: (event, fields) => write('info', event, fields),
    warn: (event, fields) => write('warn', event, fields),
    error: (event, fields) => write('error', event, fields),
  };
}
