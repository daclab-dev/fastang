import type { LogLevel } from 'vite';
const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'] as const;
type Level = typeof levels[number];
/** Development only: production servers keep their own logger configuration. */
export function developmentLogging(value = process.env['FASTANG_LOG_LEVEL']): { level: Level; vite: LogLevel; banner: boolean } {
  const level = value ?? 'warn';
  if (!(levels as readonly string[]).includes(level)) throw new Error(`FASTANG_LOG_LEVEL must be one of: ${levels.join(', ')}`);
  return {
    level: level as Level,
    vite: ['trace', 'debug', 'info'].includes(level) ? 'info' : level === 'fatal' ? 'error' : level as LogLevel,
    // Fastify already announces the address at info; preserve it at quieter levels.
    banner: !['trace', 'debug', 'info'].includes(level),
  };
}
