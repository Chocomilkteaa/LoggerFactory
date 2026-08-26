import pino from "pino";
import { createLoggerConfig, type CreateLoggerConfigOptions } from "./createLoggerConfig.ts";
import { createLoggerCloseHandler } from "./createLoggerCloseHandler.ts";
import { createLoggerFlushHandler } from "./createLoggerFlushHandler.ts";

type AppLogger = pino.Logger;

type CreateLoggerOptions = CreateLoggerConfigOptions;

interface CreateLoggerReturn {
    instance: AppLogger;
    close: () => Promise<void>;
    flush: () => Promise<void>;
}

function createLogger(options: CreateLoggerOptions): CreateLoggerReturn {
    const { options: pinoOptions, stream } = createLoggerConfig(options);

    const logger = pino(pinoOptions, stream);

    const close = createLoggerCloseHandler(stream);
    const flush = createLoggerFlushHandler(stream);

    return {
        instance: logger,
        close,
        flush,
    };
}

export { createLogger };
export type { CreateLoggerReturn, CreateLoggerOptions };
