import path from "node:path";
import type { ScopedLogSink } from "@common/logger";
import { Logger } from "@common/logger";
import electronLog from "electron-log";

const MAIN_SCOPE_PREFIX = "main";
const RENDERER_SCOPE_PREFIX = "renderer";

const rendererScopeCache = new Map<string, ScopedLogSink>();

/**
 * Shared line format for console and file transports. `{scope}` is filled by `electron-log` scopes
 * (`main/...`, `renderer/...`) from {@link createMainLogger} and {@link createRendererLogSink}.
 */
function configureLogTransports(log: typeof electronLog): void {
    const format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}";
    log.transports.console.format = format;
    log.transports.file.format = format;
}

function configureMainProcessLogFile(log: typeof electronLog, getUserDataPath: () => string): void {
    log.transports.file.resolvePath = () => path.join(getUserDataPath(), "logs/main.log");
}

function configureRendererProcessLogFile(log: typeof electronLog, getUserDataPath: () => string): void {
    log.transports.file.resolvePath = () => path.join(getUserDataPath(), "logs/renderer.log");
}

/**
 * Main process: `logs/main.log`, transport format. Call once after `userData` is finalized (e.g. portable path).
 * Pass `() => require("electron").app.getPath("userData")` from main; do not import `app` here (preload has no `electron.app`).
 */
export function setupMainProcessLogging(getUserDataPath: () => string): void {
    configureMainProcessLogFile(electronLog, getUserDataPath);
    configureLogTransports(electronLog);
}

/**
 * Preload bundle: `logs/renderer.log` and {@link configureLogTransports}. Scopes are created via {@link createRendererLogSink}.
 * Pass `() => app.getPath("userData")` using `@electron/remote` (or equivalent) `app` — `electron.app` is undefined in preload.
 */
export function setupPreloadLogging(getUserDataPath: () => string): void {
    configureRendererProcessLogFile(electronLog, getUserDataPath);
    configureLogTransports(electronLog);
}

/**
 * Cached `electron-log` scope `renderer/<context>` so `{scope}` in the shared format matches the module id (same idea as `main/<context>`).
 */
export function createRendererLogSink(context: string): ScopedLogSink {
    let sink = rendererScopeCache.get(context);
    if (!sink) {
        sink = electronLog.scope(`${RENDERER_SCOPE_PREFIX}/${context}`) as ScopedLogSink;
        rendererScopeCache.set(context, sink);
    }
    return sink;
}

/**
 * Creates a Nest-style logger for the **main** process. Context should be a stable module or class id
 * (e.g. `ipc/database`, `WindowManager`); it is prefixed with `main/`.
 */
export function createMainLogger(context: string): Logger {
    const scoped = electronLog.scope(`${MAIN_SCOPE_PREFIX}/${context}`) as ScopedLogSink;
    return new Logger(scoped);
}
