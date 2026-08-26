import pino from "pino";
import { createNodeLoggerConfig, type CreateNodeLoggerConfigOptions } from "./createLoggerConfig.ts";
import { createLoggerCloseHandler } from "./createLoggerCloseHandler.ts";
import { createLoggerFlushHandler } from "./createLoggerFlushHandler.ts";
import type { AppLogger } from "../createLogger.type.ts";

type CreateNodeLoggerOptions = CreateNodeLoggerConfigOptions;

interface CreateNodeLoggerReturn {
    instance: AppLogger;
    close: () => Promise<void>;
    flush: () => Promise<void>;
}

function createNodeLogger(options: CreateNodeLoggerOptions): CreateNodeLoggerReturn {
    const { options: pinoOptions, stream } = createNodeLoggerConfig(options);

    const logger = pino(pinoOptions, stream);

    const close = createLoggerCloseHandler(stream);
    const flush = createLoggerFlushHandler(stream);

    return {
        instance: logger,
        close,
        flush,
    };
}

export { createNodeLogger };
export type { CreateNodeLoggerReturn, CreateNodeLoggerOptions };
