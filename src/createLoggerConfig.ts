import type pino from "pino";
import { type CreateLoggerTransportOptions, createLoggerTransport } from "./createLoggerTransport.ts";
import type ThreadStream from "thread-stream";

interface CreateLoggerConfigOptions {
    minLogLevel?: pino.LevelWithSilent;
    redactPaths?: string[];
    name?: string;
    transportOptions?: CreateLoggerTransportOptions;
}

interface CreateLoggerConfigReturn {
    options: pino.LoggerOptions;
    stream?: ThreadStream;
}

function createLoggerConfig(options: CreateLoggerConfigOptions): CreateLoggerConfigReturn {
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

export { createLoggerConfig };
export type { CreateLoggerConfigOptions, CreateLoggerConfigReturn };