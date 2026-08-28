export interface LogContext { requestId?: string; workspaceId?: string; jobId?: string; providerEventId?: string; [key: string]: unknown }
export interface Logger { info(message: string, context?: LogContext): void; warn(message: string, context?: LogContext): void; error(message: string, context?: LogContext): void }

function write(level: 'info' | 'warn' | 'error', message: string, context: LogContext = {}) {
  const entry = JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...context });
  if (level === 'error') console.error(entry); else if (level === 'warn') console.warn(entry); else console.info(entry);
}
export const logger: Logger = { info: (message, context) => write('info', message, context), warn: (message, context) => write('warn', message, context), error: (message, context) => write('error', message, context) };
