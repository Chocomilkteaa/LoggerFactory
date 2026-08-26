import type pino from "pino";

type LogLevel = pino.LevelWithSilent;

type LoggerTransportTarget =
    | {
        levelOverride?: LogLevel;
        options: {
            append: boolean;
            destination: string;
            mkdir: boolean;
            sync?: boolean;
        };
        type: "file";
    }
    | {
        levelOverride?: LogLevel;
        sync?: boolean;
        type: "pretty";
    }
    | {
        levelOverride?: LogLevel;
        sync?: boolean;
        type: "stdout";
    };

const STDOUT_FILE_DESCRIPTOR = 1;

function createLoggerTransportTarget(
    target: LoggerTransportTarget
): pino.TransportTargetOptions {
    switch (target.type) {
        case "file":
            return {
                target: "pino/file",
                options: {
                    append: target.options.append,
                    destination: target.options.destination,
                    mkdir: target.options.mkdir,
                    sync: target.options.sync ?? false,
                    colorize: false,
                },
                level: target.levelOverride,
            };
        case "pretty":
            return {
                target: "pino-pretty",
                options: {
                    colorize: true,
                    destination: STDOUT_FILE_DESCRIPTOR,
                    ignore: "pid,hostname",
                    sync: target.sync,
                    translateTime: "SYS:standard",
                },
            };
        case "stdout":
            return {
                target: "pino/file",
                options: {
                    destination: STDOUT_FILE_DESCRIPTOR,
                    sync: target.sync ?? false,
                    colorize: true,
                },
                level: target.levelOverride,
            };
        default:
            return assertNever(target);
    }
}

function assertNever(value: never): never {
    throw new Error(`Unexpected logger transport: ${JSON.stringify(value)}`);
}

export { createLoggerTransportTarget };
export type { LoggerTransportTarget };