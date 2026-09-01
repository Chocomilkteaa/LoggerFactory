import { afterEach, describe, expect, it, vi } from "vitest";

import { createNodeLogger } from "../src/node/createLogger.ts";
import { createCustomLoggerTransportTarget } from "../src/node/index.ts";

const { mockBuild, mockCreateNodeLoggerConfig, mockPino } = vi.hoisted(() => {
  return {
    mockBuild: vi.fn(),
    mockCreateNodeLoggerConfig: vi.fn(),
    mockPino: vi.fn(),
  };
});

vi.mock("pino", () => ({
  default: mockPino,
}));

vi.mock("pino-abstract-transport", () => ({
  default: mockBuild,
}));

vi.mock("../src/node/createLoggerConfig.ts", () => ({
  createNodeLoggerConfig: mockCreateNodeLoggerConfig,
}));

const createMockStream = (customBehavior?: Record<string, any>) => ({
  end: vi.fn(),
  flush: vi.fn(),
  flushSync: vi.fn(),
  off: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  ...customBehavior,
});

describe("createLogger", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("flushing", () => {
    it("should reject if flush callback has error", async () => {
      const mockStream = createMockStream({
        flush: vi.fn((callback) => {
          callback(new Error("flush failed"));
        }),
      });

      mockCreateNodeLoggerConfig.mockReturnValue({
        options: {},
        stream: mockStream,
      });

      const logger = createNodeLogger({});
      await expect(logger.flush()).rejects.toThrow("Failed to flush stream: flush failed");
    });

    it("should reject if flush throws", async () => {
      const mockStream = createMockStream({
        flush: vi.fn(() => {
          throw new Error("flush failed");
        }),
      });

      mockCreateNodeLoggerConfig.mockReturnValue({
        options: {},
        stream: mockStream,
      });

      const logger = createNodeLogger({});
      await expect(logger.flush()).rejects.toThrow("Failed to flush stream: flush failed");
    });
  });

  describe("closing", () => {
    it("should reject when the transport emits an error", async () => {
      let errorHandler: ((error: Error) => void) | undefined;

      const mockStream = createMockStream({
        once: vi.fn((event, handler) => {
          if (event === "error") {
            errorHandler = handler;
          }
        }),
      });

      mockCreateNodeLoggerConfig.mockReturnValue({
        options: {},
        stream: mockStream,
      });

      const logger = createNodeLogger({});
      const closePromise = logger.close();

      expect(errorHandler).toBeDefined();

      errorHandler?.(new Error("transport failed"));

      await expect(closePromise).rejects.toThrow("Failed to close stream: transport failed");

      expect(mockStream.flushSync).toHaveBeenCalledOnce();
      expect(mockStream.end).toHaveBeenCalledOnce();
    });

    it("should reject if flushSync throws", async () => {
      const mockStream = createMockStream({
        flushSync: vi.fn(() => {
          throw new Error("flush failed");
        }),
      });

      mockCreateNodeLoggerConfig.mockReturnValue({
        options: {},
        stream: mockStream,
      });

      const logger = createNodeLogger({});
      const closePromise = logger.close();

      await expect(closePromise).rejects.toThrow("Failed to close stream: flush failed");

      expect(mockStream.flushSync).toHaveBeenCalledOnce();
      expect(mockStream.end).not.toHaveBeenCalled();
    });

    it("should reject if end throws", async () => {
      const mockStream = createMockStream({
        end: vi.fn(() => {
          throw new Error("end failed");
        }),
      });

      mockCreateNodeLoggerConfig.mockReturnValue({
        options: {},
        stream: mockStream,
      });

      const logger = createNodeLogger({});
      const closePromise = logger.close();

      await expect(closePromise).rejects.toThrow("Failed to close stream: end failed");

      expect(mockStream.flushSync).toHaveBeenCalledOnce();
      expect(mockStream.end).toHaveBeenCalledOnce();
    });
  });
});

describe("createCustomLoggerTransportTarget", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call onError when parse throws", async () => {
    const error = new Error("parse failed");
    const onError = vi.fn();
    const parse = vi.fn(() => {
      throw error;
    });
    const write = vi.fn();

    createCustomLoggerTransportTarget({
      onError,
      options: {},
      parse,
      write,
    });

    const source = (async function* () {
      await Promise.resolve();
      yield "input";
    })();

    const [handler] = mockBuild.mock.calls[0];

    await handler(source);

    expect(onError).toHaveBeenCalledExactlyOnceWith(error, "input");
    expect(parse).toHaveBeenCalledExactlyOnceWith("input");
    expect(write).not.toHaveBeenCalled();
  });

  it("should call onError when write throws", async () => {
    const error = new Error("write failed");
    const onError = vi.fn();
    const parse = vi.fn((input) => input);
    const write = vi.fn(() => {
      throw error;
    });

    createCustomLoggerTransportTarget({
      onError,
      options: {},
      parse,
      write,
    });

    const source = (async function* () {
      await Promise.resolve();
      yield "input";
    })();

    const [handler] = mockBuild.mock.calls[0];

    await handler(source);

    expect(onError).toHaveBeenCalledExactlyOnceWith(error, "input");
    expect(parse).toHaveBeenCalledExactlyOnceWith("input");
    expect(write).toHaveBeenCalledExactlyOnceWith("input");
  });

  it("should continue processing after an error", async () => {
    const error = new Error("write failed");
    const onError = vi.fn();
    const parse = vi.fn((input) => input);
    const write = vi.fn((input) => {
      if (input === "bad") {
        throw error;
      }
      return input;
    });

    createCustomLoggerTransportTarget({
      onError,
      options: {},
      parse,
      write,
    });

    const source = (async function* () {
      await Promise.resolve();
      yield "bad";
      yield "good";
    })();

    const [handler] = mockBuild.mock.calls[0];

    await handler(source);

    expect(onError).toHaveBeenCalledExactlyOnceWith(error, "bad");
    expect(parse).toHaveBeenNthCalledWith(1, "bad");
    expect(write).toHaveBeenNthCalledWith(1, "bad");
    expect(parse).toHaveBeenNthCalledWith(2, "good");
    expect(write).toHaveBeenNthCalledWith(2, "good");
  });
});
