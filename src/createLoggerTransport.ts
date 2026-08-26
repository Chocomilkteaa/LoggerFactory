import { createLoggerTransportTarget, type LoggerTransportTarget } from "./createLoggerTransportTarget.ts";
import type ThreadStream from "thread-stream";
import pino from "pino";

interface CreateLoggerTransportOptions {
    targets: LoggerTransportTarget[];
    deduplicateLogs?: boolean;
}

function createLoggerTransport(options?: CreateLoggerTransportOptions): ThreadStream | undefined {
    if (options == null) return undefined;

    const targets = options.targets.map(createLoggerTransportTarget);

    return pino.transport({
        targets,
        dedupe: options.deduplicateLogs ?? false,
    })
}

export { createLoggerTransport };
export type { CreateLoggerTransportOptions };