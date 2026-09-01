import type ThreadStream from "thread-stream";

import pino from "pino";

import { createLoggerTransportTarget, type LoggerTransportTarget } from "./createLoggerTransportTarget.ts";

interface CreateLoggerTransportOptions {
  deduplicateLogs?: boolean;
  targets: LoggerTransportTarget[];
}

function createLoggerTransport(options?: CreateLoggerTransportOptions): ThreadStream | undefined {
  if (options == null) return undefined;

  const targets = options.targets.map(createLoggerTransportTarget);

  return pino.transport({
    dedupe: options.deduplicateLogs ?? false,
    targets,
  });
}

export { createLoggerTransport };
export type { CreateLoggerTransportOptions };
