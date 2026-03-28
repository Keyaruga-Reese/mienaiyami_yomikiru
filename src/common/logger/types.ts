/**
 * Minimal surface of an electron-log scoped instance ({@link ElectronLog.LogFunctions}),
 * used so `@common/logger` does not depend on electron types in all consumers.
 */
export type ScopedLogSink = {
    log: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    verbose: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
};
