import type ThreadStream from "thread-stream";

import pino from "pino";

import { createLoggerCloseHandler } from "./createLoggerCloseHandler.ts";
import { createNodeLoggerConfig, type CreateNodeLoggerConfigOptions } from "./createLoggerConfig.ts";
import { createLoggerFlushHandler } from "./createLoggerFlushHandler.ts";

type AppLogger = pino.Logger;

type CreateNodeLoggerOptions = CreateNodeLoggerConfigOptions;

interface CreateNodeLoggerReturn {
    close: () => Promise<void>;
    flush: () => Promise<void>;
    instance: AppLogger;
    transport: ThreadStream | undefined;
}

function createNodeLogger(options: CreateNodeLoggerOptions): CreateNodeLoggerReturn {
    const { options: pinoOptions, stream } = createNodeLoggerConfig(options);

    const logger = pino(pinoOptions, stream);

    const close = createLoggerCloseHandler(stream);
    const flush = createLoggerFlushHandler(stream);

    return {
        close,
        flush,
        instance: logger,
        transport: stream,
    };
}

export { createNodeLogger };
export type { AppLogger, CreateNodeLoggerOptions, CreateNodeLoggerReturn };
