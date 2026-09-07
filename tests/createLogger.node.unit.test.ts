import { createCustomLoggerTransportTarget } from "#src/node/createCustomLoggerTransportTarget";
import { createNodeLogger } from "#src/node/createLogger";

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

vi.mock("#src/node/createLoggerConfig", () => ({
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
      const error = new Error("flush failed");
      const mockStream = createMockStream({
        flush: vi.fn((callback) => {
          callback(error);
        }),
      });

      mockCreateNodeLoggerConfig.mockReturnValue({
        options: {},
        stream: mockStream,
      });

      const logger = createNodeLogger({});
      await expect(logger.flush()).rejects.toMatchObject({ cause: error, message: "Failed to flush stream" });
    });

    it("should reject if flush throws", async () => {
      const error = new Error("flush failed");
      const mockStream = createMockStream({
        flush: vi.fn(() => {
          throw error;
        }),
      });

      mockCreateNodeLoggerConfig.mockReturnValue({
        options: {},
        stream: mockStream,
      });

      const logger = createNodeLogger({});
      await expect(logger.flush()).rejects.toMatchObject({ cause: error, message: "Failed to flush stream" });
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

      const error = new Error("transport failed");
      errorHandler?.(error);

      await expect(closePromise).rejects.toMatchObject({ cause: error, message: "Failed to close stream" });

      expect(mockStream.flushSync).toHaveBeenCalledOnce();
      expect(mockStream.end).toHaveBeenCalledOnce();
    });

    it("should reject if flushSync throws", async () => {
      const error = new Error("flush failed");
      const mockStream = createMockStream({
        flushSync: vi.fn(() => {
          throw error;
        }),
      });

      mockCreateNodeLoggerConfig.mockReturnValue({
        options: {},
        stream: mockStream,
      });

      const logger = createNodeLogger({});
      const closePromise = logger.close();

      await expect(closePromise).rejects.toMatchObject({ cause: error, message: "Failed to close stream" });

      expect(mockStream.flushSync).toHaveBeenCalledOnce();
      expect(mockStream.end).not.toHaveBeenCalled();
    });

    it("should reject if end throws", async () => {
      const error = new Error("end failed");
      const mockStream = createMockStream({
        end: vi.fn(() => {
          throw error;
        }),
      });

      mockCreateNodeLoggerConfig.mockReturnValue({
        options: {},
        stream: mockStream,
      });

      const logger = createNodeLogger({});
      const closePromise = logger.close();

      await expect(closePromise).rejects.toMatchObject({ cause: error, message: "Failed to close stream" });

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

    const handler = mockBuild.mock.calls[0]?.[0];

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

    const handler = mockBuild.mock.calls[0]?.[0];

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

    const handler = mockBuild.mock.calls[0]?.[0];

    await handler(source);

    expect(onError).toHaveBeenCalledExactlyOnceWith(error, "bad");
    expect(parse).toHaveBeenNthCalledWith(1, "bad");
    expect(write).toHaveBeenNthCalledWith(1, "bad");
    expect(parse).toHaveBeenNthCalledWith(2, "good");
    expect(write).toHaveBeenNthCalledWith(2, "good");
  });
});
