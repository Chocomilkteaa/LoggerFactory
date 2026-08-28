import { afterEach, describe, expect, it, vi } from "vitest";

import { createNodeLogger } from "../src/node/createLogger.ts";

const { mockCreateNodeLoggerConfig, mockPino } = vi.hoisted(() => {
    return {
        mockCreateNodeLoggerConfig: vi.fn(),
        mockPino: vi.fn(),
    };
});

vi.mock("pino", () => ({
    default: mockPino,
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
                })
            });

            mockCreateNodeLoggerConfig.mockReturnValue({
                options: {},
                stream: mockStream,
            });

            const logger = createNodeLogger({});
            const closePromise = logger.close();

            expect(errorHandler).toBeDefined();

            errorHandler?.(new Error("transport failed"));

            await expect(closePromise).rejects.toThrow(
                "Failed to close stream: transport failed",
            );

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

            await expect(closePromise).rejects.toThrow(
                "Failed to close stream: flush failed",
            );

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

            await expect(closePromise).rejects.toThrow(
                "Failed to close stream: end failed",
            );

            expect(mockStream.flushSync).toHaveBeenCalledOnce();
            expect(mockStream.end).toHaveBeenCalledOnce();
        });
    });
});