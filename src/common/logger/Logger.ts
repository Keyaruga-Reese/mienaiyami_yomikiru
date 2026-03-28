import type { ScopedLogSink } from "./types";

/**
 * Delegates to an electron-log scoped sink so transports (file, console) stay centralized.
 */
export class Logger {
    /**
     * @param sink - Result of `electronLog.scope('main/MyService')` or `renderer/...`
     */
    constructor(private readonly sink: ScopedLogSink) {}

    /**
     * General informational message (maps to electron-log `info`, same as Nest `Logger.log`).
     */
    log(...args: unknown[]): void {
        this.sink.log(...args);
    }

    info(...args: unknown[]): void {
        this.sink.info(...args);
    }

    error(...args: unknown[]): void {
        this.sink.error(...args);
    }

    warn(...args: unknown[]): void {
        this.sink.warn(...args);
    }

    debug(...args: unknown[]): void {
        this.sink.debug(...args);
    }

    verbose(...args: unknown[]): void {
        this.sink.verbose(...args);
    }
}
