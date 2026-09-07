import type pino from "pino";

import fastRedact from "fast-redact";

import type { CreateLoggerConfigOptions, CreateLoggerConfigReturn } from "#src/createLogger.type";

type CreateBrowserLoggerConfigOptions = CreateLoggerConfigOptions;
type CreateBrowserLoggerConfigReturn = CreateLoggerConfigReturn;

function redactionSerializer(paths: CreateBrowserLoggerConfigOptions["redactPaths"]): fastRedact.redactFn {
  return fastRedact({ censor: "[REDACTED]", paths });
}

function createBrowserLoggerConfig({
  minLogLevel = "info",
  name = "Logger",
  redactPaths,
}: CreateBrowserLoggerConfigOptions): CreateBrowserLoggerConfigReturn {
  const pinoOptions: pino.LoggerOptions = {
    level: minLogLevel,
    name,
  };

  if (redactPaths?.length) {
    const redact = redactionSerializer(redactPaths);
    pinoOptions.browser = {
      ...pinoOptions.browser,
      write: {
        debug: (obj) => {
          console.debug(redact(obj));
        },
        error: (obj) => {
          console.error(redact(obj));
        },
        fatal: (obj) => {
          console.error(redact(obj));
        },
        info: (obj) => {
          console.info(redact(obj));
        },
        trace: (obj) => {
          console.trace(redact(obj));
        },
        warn: (obj) => {
          console.warn(redact(obj));
        },
      },
    };
  }

  return {
    options: pinoOptions,
  };
}

export { createBrowserLoggerConfig };
export type { CreateBrowserLoggerConfigOptions, CreateBrowserLoggerConfigReturn };
