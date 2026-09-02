import { appendFile } from "fs/promises";

import { createCustomLoggerTransportTarget } from "#src/node/createCustomLoggerTransportTarget";

interface TestTransportOptions {
  destination: string;
}

async function appendEvent(destination: string, event: unknown) {
  await appendFile(destination, `${JSON.stringify(event)}\n`);
}

function target(options: TestTransportOptions) {
  return createCustomLoggerTransportTarget({
    close: async () => {
      await appendEvent(options.destination, {
        type: "close",
      });
    },
    flush: async () => {
      await appendEvent(options.destination, {
        type: "flush",
      });
    },
    onError: async (error) => {
      await appendEvent(options.destination, {
        message: error instanceof Error ? error.message : String(error),
        type: "error",
      });
    },
    options,
    parse: (input) => {
      return {
        message: (input as { msg: string }).msg,
      };
    },
    write: async (value) => {
      await appendEvent(options.destination, {
        type: "write",
        value,
      });
    },
  });
}

export default target;
