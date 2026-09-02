import { mkdtemp, readFile, rm } from "fs/promises";
import crypto from "node:crypto";
import { tmpdir } from "os";
import { join } from "path";

import { createNodeLogger, type CreateNodeLoggerReturn } from "#src/node/createLogger";

const loggers: CreateNodeLoggerReturn[] = [];

async function parseLog({ expectError, filePath }: { expectError?: true; filePath: string }): Promise<any[]> {
  try {
    const content = await readFile(filePath, "utf-8");
    const entries = content
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    return entries;
  } catch (_error: unknown) {
    if (!expectError) {
      throw _error;
    }

    return [];
  }
}

describe("createNodeLogger", () => {
  afterEach(async () => {
    await Promise.all(loggers.map((logger) => logger.close()));
    loggers.length = 0;
  });

  describe("boundaries", () => {
    it("should create a logger with name", () => {
      const logger = createNodeLogger({ name: "test-logger" });
      loggers.push(logger);

      expect(logger.instance).toBeDefined();
      expect(logger.instance.bindings().name).toBe("test-logger");
    });

    it("should create a logger with minimum log level", () => {
      const logger = createNodeLogger({ minLogLevel: "warn" });
      loggers.push(logger);

      expect(logger.instance).toBeDefined();
      expect(logger.instance.level).toBe("warn");
    });

    it('should create a logger with minimum log level being "debug" when not specified', () => {
      const logger = createNodeLogger({});
      loggers.push(logger);

      expect(logger.instance).toBeDefined();
      expect(logger.instance.level).toBe("info");
    });

    it("should return close and flush handlers", () => {
      const logger = createNodeLogger({});
      loggers.push(logger);

      expect(logger.close).toBeTypeOf("function");
      expect(logger.flush).toBeTypeOf("function");
    });
  });

  describe("logging", () => {
    const temporaryDirectories: string[] = [];

    async function createDestinationFilePath(): Promise<string> {
      const directory = await mkdtemp(join(tmpdir(), "app-logger-"));
      temporaryDirectories.push(directory);

      return join(directory, `logs-${crypto.randomUUID()}.log`);
    }

    afterEach(async () => {
      await Promise.all(temporaryDirectories.map((dir) => rm(dir, { force: true, recursive: true })));
      temporaryDirectories.length = 0;
    });

    describe("flushing", () => {
      it("should flush all log entries", async () => {
        const destination = await createDestinationFilePath();
        const logger = createNodeLogger({
          transportOptions: {
            targets: [
              {
                options: {
                  append: true,
                  destination: destination,
                  mkdir: true,
                  sync: true,
                },
                type: "file",
              },
            ],
          },
        });
        loggers.push(logger);

        logger.instance.info({ message: "Test log entry" });
        const entriesBeforeFlush = await parseLog({ expectError: true, filePath: destination });
        expect(entriesBeforeFlush).toHaveLength(0);

        await expect(logger.flush()).resolves.toBeUndefined();

        const entriesAfterFlush = await parseLog({ filePath: destination });
        expect(entriesAfterFlush).toHaveLength(1);
        expect(entriesAfterFlush[0]).toMatchObject({ message: "Test log entry" });
      });

      it("should resolve without transports", async () => {
        const logger = createNodeLogger({});
        await expect(logger.flush()).resolves.toBeUndefined();
      });
    });

    describe("closing", () => {
      it("should flush all logs and close the logger", async () => {
        const destination = await createDestinationFilePath();
        const logger = createNodeLogger({
          transportOptions: {
            targets: [
              {
                options: {
                  append: true,
                  destination: destination,
                  mkdir: true,
                  sync: true,
                },
                type: "file",
              },
            ],
          },
        });

        logger.instance.info({ message: "Test log entry" });
        await expect(logger.close()).resolves.toBeUndefined();

        const entries = await parseLog({ filePath: destination });
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({ message: "Test log entry" });

        const errorPromise = new Promise<Error>((resolve) => {
          logger.transport?.once("error", resolve);
        });
        logger.instance.info({ message: "This should not be logged" });
        await expect(errorPromise).resolves.toBeInstanceOf(Error);

        await expect(logger.flush()).rejects.toThrow();

        const entriesAfterClose = await parseLog({ filePath: destination });
        expect(entriesAfterClose).toHaveLength(1);
        expect(entriesAfterClose[0]).toMatchObject({ message: "Test log entry" });
      });

      it("should resolve when closing an already closed logger", async () => {
        const destination = await createDestinationFilePath();
        const logger = createNodeLogger({
          transportOptions: {
            targets: [
              {
                options: {
                  append: true,
                  destination: destination,
                  mkdir: true,
                  sync: true,
                },
                type: "file",
              },
            ],
          },
        });

        await logger.close();
        await expect(logger.close()).resolves.toBeUndefined();
      });

      it("should resolve without transports", async () => {
        const logger = createNodeLogger({});
        await expect(logger.close()).resolves.toBeUndefined();
      });
    });

    describe("file", () => {
      it("should log to target file", async () => {
        const destination = await createDestinationFilePath();
        const logger = createNodeLogger({
          transportOptions: {
            targets: [
              {
                options: {
                  append: true,
                  destination: destination,
                  mkdir: true,
                  sync: true,
                },
                type: "file",
              },
            ],
          },
        });
        loggers.push(logger);

        expect(logger.instance).toBeDefined();

        logger.instance.info({ message: "Test log entry" });
        await logger.flush();

        const entries = await parseLog({ filePath: destination });
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({ message: "Test log entry" });
      });

      it("should redact sensitive fields in the log", async () => {
        const destination = await createDestinationFilePath();
        const logger = createNodeLogger({
          redactPaths: ["password", "token", "nested.key"],
          transportOptions: {
            targets: [
              {
                options: {
                  append: true,
                  destination: destination,
                  mkdir: true,
                  sync: true,
                },
                type: "file",
              },
            ],
          },
        });
        loggers.push(logger);

        expect(logger.instance).toBeDefined();

        logger.instance.info({ message: "Test log entry", nested: { key: "value" }, password: "secret", token: "abc123" });
        await logger.flush();

        const entries = await parseLog({ filePath: destination });
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({ message: "Test log entry", nested: { key: "[REDACTED]" }, password: "[REDACTED]", token: "[REDACTED]" });
      });

      it("should filter output logs based on minimum log level", async () => {
        const destination = await createDestinationFilePath();
        const logger = createNodeLogger({
          minLogLevel: "warn",
          transportOptions: {
            targets: [
              {
                options: {
                  append: true,
                  destination: destination,
                  mkdir: true,
                  sync: true,
                },
                type: "file",
              },
            ],
          },
        });
        loggers.push(logger);

        expect(logger.instance).toBeDefined();

        logger.instance.info({ message: "This should not be logged" });
        logger.instance.warn({ message: "This should be logged" });
        await logger.flush();

        const entries = await parseLog({ filePath: destination });
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({ message: "This should be logged" });
      });

      it("should create a logger with multiple transport targets", async () => {
        const destination1 = await createDestinationFilePath();
        const destination2 = await createDestinationFilePath();

        const logger = createNodeLogger({
          transportOptions: {
            targets: [
              {
                options: {
                  append: true,
                  destination: destination1,
                  mkdir: true,
                  sync: true,
                },
                type: "file",
              },
              {
                options: {
                  append: true,
                  destination: destination2,
                  mkdir: true,
                  sync: true,
                },
                type: "file",
              },
            ],
          },
        });
        loggers.push(logger);

        expect(logger.instance).toBeDefined();

        logger.instance.info({ message: "This should be logged to both targets" });
        await logger.flush();

        const entries1 = await parseLog({ filePath: destination1 });
        expect(entries1).toHaveLength(1);
        expect(entries1[0]).toMatchObject({ message: "This should be logged to both targets" });

        const entries2 = await parseLog({ filePath: destination2 });
        expect(entries2).toHaveLength(1);
        expect(entries2[0]).toMatchObject({ message: "This should be logged to both targets" });
      });

      it("should filter output logs based on levelOverride for each transport target", async () => {
        const destination1 = await createDestinationFilePath();
        const destination2 = await createDestinationFilePath();

        const logger = createNodeLogger({
          transportOptions: {
            targets: [
              {
                levelOverride: "error",
                options: {
                  append: true,
                  destination: destination1,
                  mkdir: true,
                  sync: true,
                },
                type: "file",
              },
              {
                levelOverride: "info",
                options: {
                  append: true,
                  destination: destination2,
                  mkdir: true,
                  sync: true,
                },
                type: "file",
              },
            ],
          },
        });
        loggers.push(logger);

        expect(logger.instance).toBeDefined();

        logger.instance.info({ message: "This should be logged to target 2 only" });
        logger.instance.error({ message: "This should be logged to both targets" });
        await logger.flush();

        const entries1 = await parseLog({ filePath: destination1 });
        expect(entries1).toHaveLength(1);
        expect(entries1[0]).toMatchObject({ message: "This should be logged to both targets" });

        const entries2 = await parseLog({ filePath: destination2 });
        expect(entries2).toHaveLength(2);
        expect(entries2[0]).toMatchObject({ message: "This should be logged to target 2 only" });
        expect(entries2[1]).toMatchObject({ message: "This should be logged to both targets" });
      });

      it("should deduplicate logs when deduplicateLogs is set to true", async () => {
        const destination1 = await createDestinationFilePath();
        const destination2 = await createDestinationFilePath();
        const logger = createNodeLogger({
          transportOptions: {
            deduplicateLogs: true,
            targets: [
              {
                levelOverride: "warn",
                options: {
                  append: true,
                  destination: destination1,
                  mkdir: true,
                  sync: true,
                },
                type: "file",
              },
              {
                options: {
                  append: true,
                  destination: destination2,
                  mkdir: true,
                  sync: true,
                },
                type: "file",
              },
            ],
          },
        });
        loggers.push(logger);

        expect(logger.instance).toBeDefined();

        logger.instance.warn({ message: "This should be logged only once" });
        await logger.flush();

        const entries1 = await parseLog({ filePath: destination1 });
        expect(entries1).toHaveLength(1);
        expect(entries1[0]).toMatchObject({ message: "This should be logged only once" });

        const entries2 = await parseLog({ filePath: destination2 });
        expect(entries2).toHaveLength(0);
      });
    });

    describe("custom", () => {
      it("should log to a custom transport target", async () => {
        const destination = await createDestinationFilePath();
        const logger = createNodeLogger({
          transportOptions: {
            targets: [
              {
                options: {
                  destination,
                },
                target: "./utils/customTransportTarget_writable.ts",
                type: "custom",
              },
            ],
          },
        });
        loggers.push(logger);

        expect(logger.instance).toBeDefined();

        logger.instance.info({ message: "Test log entry" });
        await logger.flush();

        const entries = await parseLog({ filePath: destination });

        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({ message: "Test log entry" });
      });

      describe("createCustomLoggerTransportTarget", () => {
        it("should log to a custom transport target in correct order", async () => {
          const destination = await createDestinationFilePath();
          const logger = createNodeLogger({
            transportOptions: {
              targets: [
                {
                  options: {
                    destination,
                  },
                  target: "./utils/customTransportTarget_custom.ts",
                  type: "custom",
                },
              ],
            },
          });

          expect(logger.instance).toBeDefined();

          logger.instance.info("First log entry");
          logger.instance.info("Second log entry");
          await logger.close();

          const entries = await parseLog({ filePath: destination });

          expect(entries).toHaveLength(4);
          expect(entries[0]).toMatchObject({ type: "write", value: { message: "First log entry" } });
          expect(entries[1]).toMatchObject({ type: "write", value: { message: "Second log entry" } });
          expect(entries[2]).toMatchObject({ type: "flush" });
          expect(entries[3]).toMatchObject({ type: "close" });
        });

        it("should flush and close transport when closing the logger", async () => {
          const destination = await createDestinationFilePath();

          const logger = createNodeLogger({
            transportOptions: {
              targets: [
                {
                  options: {
                    destination,
                  },
                  target: "./utils/customTransportTarget_custom.ts",
                  type: "custom",
                },
              ],
            },
          });

          expect(logger.instance).toBeDefined();

          logger.instance.info("Test log entry");
          await logger.close();

          const entries = await parseLog({ filePath: destination });

          expect(entries).toHaveLength(3);
          expect(entries[0]).toMatchObject({ type: "write", value: { message: "Test log entry" } });
          expect(entries[1]).toMatchObject({ type: "flush" });
          expect(entries[2]).toMatchObject({ type: "close" });
        });
      });
    });
  });
});
