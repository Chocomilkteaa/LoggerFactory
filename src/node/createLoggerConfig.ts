import type pino from "pino";
import { type CreateLoggerTransportOptions, createLoggerTransport } from "./createLoggerTransport.ts";
import type ThreadStream from "thread-stream";
import type { CreateLoggerConfigOptions, CreateLoggerConfigReturn } from "../createLogger.type.ts";

interface CreateNodeLoggerConfigOptions extends CreateLoggerConfigOptions {
    transportOptions?: CreateLoggerTransportOptions;
}

interface CreateNodeLoggerConfigReturn extends CreateLoggerConfigReturn {
    stream?: ThreadStream;
}

function createNodeLoggerConfig(options: CreateNodeLoggerConfigOptions): CreateNodeLoggerConfigReturn {
    const stream = createLoggerTransport(options.transportOptions);

    const pinoOptions: pino.LoggerOptions = {
        level: options.minLogLevel ?? "info",
        redact: options.redactPaths,
        name: options.name,
    };

    if (options.redactPaths?.length) {
        pinoOptions.redact = {
            censor: "[REDACTED]",
            paths: options.redactPaths,
        };
    }

    return {
        options: pinoOptions,
        stream,
    };
}


export { createNodeLoggerConfig };
export type { CreateNodeLoggerConfigOptions, CreateNodeLoggerConfigReturn };