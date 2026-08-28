import pino from "pino";

import type { AppLogger } from "../createLogger.type.ts";

import { createBrowserLoggerConfig, type CreateBrowserLoggerConfigOptions } from "./createLoggerConfig.ts";

type CreateBrowserLoggerOptions = CreateBrowserLoggerConfigOptions;
type CreateBrowserLoggerReturn = AppLogger;

function createBrowserLogger({name, ...options}: CreateBrowserLoggerOptions): CreateBrowserLoggerReturn {
    const { options: pinoOptions } = createBrowserLoggerConfig(options);

    const logger = pino(pinoOptions);
    return name ? logger.child({ name }) : logger;
}

export { createBrowserLogger };
export type { CreateBrowserLoggerOptions, CreateBrowserLoggerReturn };
