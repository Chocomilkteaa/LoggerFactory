import { createBrowserLogger } from "#src/browser/createLogger";

describe("createBrowserLogger", () => {
  describe("configuration", () => {
    it("should create a logger with minimum log level", () => {
      const logger = createBrowserLogger({ minLogLevel: "warn" });

      expect(logger).toBeDefined();
      expect(logger.level).toBe("warn");
    });

    it('should create a logger with minimum log level being "info" when not specified', () => {
      const logger = createBrowserLogger({});

      expect(logger).toBeDefined();
      expect(logger.level).toBe("info");
    });
  });

  describe("logging", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should include name in the log", () => {
      const logSpy = vi.spyOn(console, "info").mockImplementation(() => {
        void 0;
      });

      const logger = createBrowserLogger({ name: "test-logger" });

      logger.info("Test log with name");

      expect(logSpy).toHaveBeenCalledWith(
        {
          name: "test-logger",
        },
        "Test log with name",
      );
    });

    it.each([
      ["trace", "trace"],
      ["debug", "debug"],
      ["info", "info"],
      ["warn", "warn"],
      ["error", "error"],
    ] as const)("should write log with level %s to the console", (level, consoleType) => {
      const logSpy = vi.spyOn(console, consoleType).mockImplementation(() => {
        void 0;
      });

      const logger = createBrowserLogger({ minLogLevel: level });

      logger[level](`test ${level}`);

      expect(logSpy).toHaveBeenCalledWith(`test ${level}`);
    });

    it("should redact sensitive fields in the log", () => {
      const logSpy = vi.spyOn(console, "info").mockImplementation(() => {
        void 0;
      });

      const logger = createBrowserLogger({ redactPaths: ["password", "token", "nested.key"] });

      logger.info({ nested: { key: "value" }, password: "secret", token: "abc123" }, "Test log entry");

      expect(JSON.parse(logSpy.mock.calls[0]?.[0])).toMatchObject({
        msg: "Test log entry",
        nested: { key: "[REDACTED]" },
        password: "[REDACTED]",
        token: "[REDACTED]",
      });
    });
  });
});
