import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cdp, type CDPSession } from "vitest/browser";

import { createBrowserLogger } from "../src/browser/createLogger.ts";

describe("createBrowserLogger", () => {
  describe("configuration", () => {
    it("should create a logger with minimum log level", () => {
      const logger = createBrowserLogger({ minLogLevel: "warn" });

      expect(logger).toBeDefined();
      expect(logger.level).toBe("warn");
    });

    it('should create a logger with minimum log level being "debug" when not specified', () => {
      const logger = createBrowserLogger({});

      expect(logger).toBeDefined();
      expect(logger.level).toBe("info");
    });
  });

  describe("logging", () => {
    let session: CDPSession;
    const logs: {
      type: string;
      values: unknown[];
    }[] = [];

    const logHandler = (payload: { args: { description?: string; objectId?: string; value?: unknown }[]; type: string }): void => {
      void (async () => {
        const values = await Promise.all(
          payload.args.map(async (arg) => {
            if (arg.objectId == null) return arg.value;

            const { result } = await session.send("Runtime.getProperties", { objectId: arg.objectId, ownProperties: true });

            return Object.fromEntries(result.map(({ name, value }) => [name, value?.value]));
          }),
        );
        logs.push({
          type: payload.type,
          values,
        });
      })();
    };

    beforeEach(async () => {
      session = cdp();
      await session.send("Runtime.enable");
      session.on("Runtime.consoleAPICalled", logHandler);
    });

    afterEach(async () => {
      session.off("Runtime.consoleAPICalled", logHandler);
      await session.send("Runtime.disable");
      logs.length = 0;
      vi.restoreAllMocks();
    });

    it("should include name in the log", async () => {
      const logger = createBrowserLogger({ name: "test-logger" });

      logger.info("Test log with name");

      await expect.poll(() => logs.length).toBeGreaterThan(0);

      expect(logs).toContainEqual({
        type: "info",
        values: expect.arrayContaining([expect.objectContaining({ name: "test-logger" }), expect.stringContaining("Test log with name")]),
      });
    });

    it.each([
      ["trace", "trace"],
      ["debug", "debug"],
      ["info", "info"],
      ["warn", "warning"],
      ["error", "error"],
    ] as const)("should write log with level %s to the console", async (level, consoleType) => {
      const logger = createBrowserLogger({ minLogLevel: level });

      logger[level](`test ${level}`);

      await expect.poll(() => logs.length).toBeGreaterThan(0);

      expect(logs).toContainEqual({
        type: consoleType,
        values: expect.arrayContaining([expect.stringContaining(`test ${level}`)]),
      });
    });

    it("should redact sensitive fields in the log", async () => {
      const logger = createBrowserLogger({ redactPaths: ["password", "token", "nested.key"] });
      logger.info({ message: "Test log entry", nested: { key: "value" }, password: "secret", token: "abc123" });

      await expect.poll(() => logs.length).toBeGreaterThan(0);

      const log = logs[0];

      expect(log.type).toBe("info");
      expect(JSON.parse(log.values[0] as string)).toMatchObject({
        message: "Test log entry",
        nested: { key: "[REDACTED]" },
        password: "[REDACTED]",
        token: "[REDACTED]",
      });
    });
  });
});
