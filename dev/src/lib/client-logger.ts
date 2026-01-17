type LogFn = (...args: unknown[]) => void;

const isProd = process.env.NODE_ENV === 'production';

function bind(method: LogFn): LogFn {
  return isProd ? () => {} : method.bind(console);
}

export const clientLogger = {
  debug: bind(console.debug),
  info: bind(console.log),
  warn: bind(console.warn),
  error: bind(console.error),
} as const;

