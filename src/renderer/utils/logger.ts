import { Logger } from "@common/logger";

export function createRendererLogger(context: string): Logger {
    return new Logger(window.createRendererLogSink(context));
}
