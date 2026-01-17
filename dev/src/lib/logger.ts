import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev ? { target: 'pino-pretty' } : undefined,
  redact: ['password', 'token', 'idNumber', 'realName'],
});

export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({ requestId, userId });
}

