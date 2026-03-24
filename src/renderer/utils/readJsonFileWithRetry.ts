import { sleep } from "./utils";

export type ReadJsonRetryOptions = {
    maxAttempts?: number;
    delayMs?: number;
    retryIf?: (error: unknown, raw: string) => boolean;
    onRetry?: (attempt: number, error: unknown, raw: string) => void;
};

const defaultRetryIf = (error: unknown, raw: string): boolean => raw.trim() === "" || error instanceof SyntaxError;

/**
 * Reads and parses JSON asynchronously with configurable retry behavior.
 * Useful for file-watch races where a change event can happen while another process is writing.
 */
export const readJsonFileWithRetry = async <T = unknown>(
    filePath: string,
    options?: ReadJsonRetryOptions,
): Promise<T> => {
    const maxAttempts = options?.maxAttempts ?? 8;
    const delayMs = options?.delayMs ?? 25;
    const retryIf = options?.retryIf ?? defaultRetryIf;
    const onRetry = options?.onRetry;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const raw = await window.fs.readFile(filePath, "utf8");
        try {
            return JSON.parse(raw) as T;
        } catch (error) {
            lastError = error;
            if (attempt >= maxAttempts || !retryIf(error, raw)) break;
            onRetry?.(attempt, error, raw);
            if (delayMs > 0) await sleep(delayMs);
        }
    }
    throw lastError;
};

/**
 * Reads and parses JSON synchronously with immediate retries.
 * This variant intentionally has no wait between attempts.
 */
export const readJsonFileWithRetrySync = <T = unknown>(filePath: string, options?: ReadJsonRetryOptions): T => {
    const maxAttempts = options?.maxAttempts ?? 8;
    const retryIf = options?.retryIf ?? defaultRetryIf;
    const onRetry = options?.onRetry;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const raw = window.fs.readFileSync(filePath, "utf8");
        try {
            return JSON.parse(raw) as T;
        } catch (error) {
            lastError = error;
            if (attempt >= maxAttempts || !retryIf(error, raw)) break;
            onRetry?.(attempt, error, raw);
        }
    }
    throw lastError;
};
