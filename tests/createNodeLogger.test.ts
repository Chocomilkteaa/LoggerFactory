import { afterEach, describe, expect, it } from "vitest";

import { createNodeLogger, type CreateNodeLoggerReturn } from "../src/node/createLogger.ts";
import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const loggers: CreateNodeLoggerReturn[] = [];

async function parseLog(filePath: string): Promise<any[]> {
    const content = await readFile(filePath, "utf-8");

    const entries = content.split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));

    return entries;
}

describe("createNodeLogger", () => {
    afterEach(async () => {
        await Promise.all(loggers.map((logger) => logger.close()));
        loggers.length = 0;
    });

    describe("configuration", () => {
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

        it("should create a logger with minimum log level being \"debug\" when not specified", () => {
            const logger = createNodeLogger({});
            loggers.push(logger);

            expect(logger.instance).toBeDefined();
            expect(logger.instance.level).toBe("info");
        });
    });

    describe("logging", () => {
        const temporaryDirectories: string[] = [];

        async function createDestinationFilePath(): Promise<string> {
            const directory = await mkdtemp(join(tmpdir(), "app-logger-"));
            temporaryDirectories.push(directory);

            return join(directory, `logs-${Date.now()}.log`);
        }

        afterEach(async () => {
            await Promise.all(temporaryDirectories.map((dir) => rm(dir, { recursive: true, force: true })));
            temporaryDirectories.length = 0;
        });

        it("should create a logger with redaction paths", async () => {
            const destination = await createDestinationFilePath();
            const logger = createNodeLogger({
                redactPaths: ["password", "token", "nested.key"], transportOptions: {
                    targets: [{
                        type: "file", options: {
                            destination: destination,
                            mkdir: true,
                            append: true,
                            sync: true,
                        }
                    }]
                },
            });
            loggers.push(logger);

            expect(logger.instance).toBeDefined();

            logger.instance.info({ password: "secret", token: "abc123", nested: { key: "value" }, message: "Test log entry" });
            await logger.flush();

            const entries = await parseLog(destination);
            expect(entries).toHaveLength(1);
            expect(entries[0]).toMatchObject({ password: "[REDACTED]", token: "[REDACTED]", nested: { key: "[REDACTED]" }, message: "Test log entry" });
        });

        it("should filter output logs based on minimum log level", async () => {
            const destination = await createDestinationFilePath();
            const logger = createNodeLogger({
                minLogLevel: "warn",
                transportOptions: {
                    targets: [{
                        type: "file", options: {
                            destination: destination,
                            mkdir: true,
                            append: true,
                            sync: true,
                        }
                    }]
                },
            });
            loggers.push(logger);

            expect(logger.instance).toBeDefined();

            logger.instance.info({ message: "This should not be logged" });
            logger.instance.warn({ message: "This should be logged" });
            await logger.flush();

            const entries = await parseLog(destination);
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
                            type: "file", options: {
                                destination: destination1,
                                mkdir: true,
                                append: true,
                                sync: true,
                            }
                        },
                        {
                            type: "file", options: {
                                destination: destination2,
                                mkdir: true,
                                append: true,
                                sync: true,
                            }
                        }
                    ]
                },
            });
            loggers.push(logger);

            expect(logger.instance).toBeDefined();

            logger.instance.info({ message: "This should be logged to both targets" });
            await logger.flush();

            const entries1 = await parseLog(destination1);
            expect(entries1).toHaveLength(1);
            expect(entries1[0]).toMatchObject({ message: "This should be logged to both targets" });
            
            const entries2 = await parseLog(destination2);
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
                            levelOverride: "error", type: "file", options: {
                                destination: destination1,
                                mkdir: true,
                                append: true,
                                sync: true,
                            }
                        },
                        {
                            levelOverride: "info", type: "file", options: {
                                destination: destination2,
                                mkdir: true,
                                append: true,
                                sync: true,
                            }
                        }
                    ]
                },
            });
            loggers.push(logger);

            expect(logger.instance).toBeDefined();

            logger.instance.info({ message: "This should be logged to target 2 only" });
            logger.instance.error({ message: "This should be logged to both targets" });
            await logger.flush();

            const entries1 = await parseLog(destination1);
            expect(entries1).toHaveLength(1);
            expect(entries1[0]).toMatchObject({ message: "This should be logged to both targets" });
            
            const entries2 = await parseLog(destination2);
            expect(entries2).toHaveLength(2);
            expect(entries2[0]).toMatchObject({ message: "This should be logged to target 2 only" });
            expect(entries2[1]).toMatchObject({ message: "This should be logged to both targets" });
        });

        it("should deduplicate logs when deduplicateLogs is set to true", async () => {
            const destination1 = await createDestinationFilePath();
            const destination2 = await createDestinationFilePath();
            const logger = createNodeLogger({
                transportOptions: {
                    targets: [
                        {
                            levelOverride: "warn", type: "file", options: {
                                destination: destination1,
                                mkdir: true,
                                append: true,
                                sync: true,
                            }
                        },
                        {
                            type: "file", options: {
                                destination: destination2,
                                mkdir: true,
                                append: true,
                                sync: true,
                            }
                        }
                    ],
                    deduplicateLogs: true,
                },
            });
            loggers.push(logger);

            expect(logger.instance).toBeDefined();

            logger.instance.warn({ message: "This should be logged only once" });
            await logger.flush();

            const entries1 = await parseLog(destination1);
            expect(entries1).toHaveLength(1);
            expect(entries1[0]).toMatchObject({ message: "This should be logged only once" });
            
            const entries2 = await parseLog(destination2);
            expect(entries2).toHaveLength(0);
        });
    });
});