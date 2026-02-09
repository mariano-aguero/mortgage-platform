interface LogContext {
  [key: string]: unknown;
}

function formatLog(level: string, message: string, context?: LogContext): string {
  return JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  });
}

export function info(message: string, context?: LogContext): void {
  console.log(formatLog('INFO', message, context));
}

export function error(message: string, context?: LogContext): void {
  console.error(formatLog('ERROR', message, context));
}

export function warn(message: string, context?: LogContext): void {
  console.warn(formatLog('WARN', message, context));
}

export function debug(message: string, context?: LogContext): void {
  console.debug(formatLog('DEBUG', message, context));
}
