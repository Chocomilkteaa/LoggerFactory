import pino from "pino";

import { createBrowserLoggerConfig, type CreateBrowserLoggerConfigOptions } from "./createLoggerConfig.ts";

type AppLogger = pino.Logger;

type CreateBrowserLoggerOptions = CreateBrowserLoggerConfigOptions;
type CreateBrowserLoggerReturn = AppLogger;

function createBrowserLogger({ name, ...options }: CreateBrowserLoggerOptions): CreateBrowserLoggerReturn {
  const { options: pinoOptions } = createBrowserLoggerConfig(options);

  const logger = pino(pinoOptions);
  return name ? logger.child({ name }) : logger;
}

export { createBrowserLogger };
export type { AppLogger, CreateBrowserLoggerOptions, CreateBrowserLoggerReturn };
