import type pino from "pino";
import fastRedact from 'fast-redact';
import type { CreateLoggerConfigOptions, CreateLoggerConfigReturn } from "../createLogger.type.ts";

type CreateBrowserLoggerConfigOptions = CreateLoggerConfigOptions;

type CreateBrowserLoggerConfigReturn = CreateLoggerConfigReturn;

function redactionSerializer(paths: CreateBrowserLoggerConfigOptions["redactPaths"]): fastRedact.redactFn {
    return fastRedact({ paths, censor: "[REDACTED]" });
}


function createBrowserLoggerConfig(options: CreateBrowserLoggerConfigOptions): CreateBrowserLoggerConfigReturn {
    const pinoOptions: pino.LoggerOptions = {
        level: options.minLogLevel ?? "info",
        name: options.name,
    };

    if (options.redactPaths?.length) {
        const redact = redactionSerializer(options.redactPaths);
        pinoOptions.browser = {
            ...pinoOptions.browser,
            write: {
                trace: obj => { console.trace(redact(obj)) },
                debug: obj => { console.debug(redact(obj)) },
                info: obj => { console.info(redact(obj)) },
                warn: obj => { console.warn(redact(obj)) },
                error: obj => { console.error(redact(obj)) },
                fatal: obj => { console.error(redact(obj)) },
            }
        };
    }

    return {
        options: pinoOptions,
    };
}

export { createBrowserLoggerConfig };
export type { CreateBrowserLoggerConfigOptions, CreateBrowserLoggerConfigReturn };