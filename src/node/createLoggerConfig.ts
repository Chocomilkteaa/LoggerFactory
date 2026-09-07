import type pino from "pino";
import type ThreadStream from "thread-stream";

import type { CreateLoggerConfigOptions, CreateLoggerConfigReturn } from "#src/createLogger.type";

import { createLoggerTransport, type CreateLoggerTransportOptions } from "./createLoggerTransport.ts";

interface CreateNodeLoggerConfigOptions extends CreateLoggerConfigOptions {
  transportOptions?: CreateLoggerTransportOptions;
}

interface CreateNodeLoggerConfigReturn extends CreateLoggerConfigReturn {
  stream: ThreadStream | undefined;
}

function createNodeLoggerConfig({ minLogLevel = "info", name = "Logger", redactPaths, transportOptions }: CreateNodeLoggerConfigOptions): CreateNodeLoggerConfigReturn {
  const stream = createLoggerTransport(transportOptions);

  const pinoOptions: pino.LoggerOptions = {
    level: minLogLevel,
    name,
  };

  if (redactPaths?.length) {
    pinoOptions.redact = {
      censor: "[REDACTED]",
      paths: redactPaths,
    };
  }

  return {
    options: pinoOptions,
    stream,
  };
}

export { createNodeLoggerConfig };
export type { CreateNodeLoggerConfigOptions, CreateNodeLoggerConfigReturn };
