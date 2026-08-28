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
        options: {
            destination: string;
        };
        target: string;
        type: "custom";
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

function assertNever(value: never): never {
    throw new Error(`Unexpected logger transport: ${JSON.stringify(value)}`);
}

function createLoggerTransportTarget(
    target: LoggerTransportTarget
): pino.TransportTargetOptions {
    switch (target.type) {
        case "custom":
            return {
                level: target.levelOverride,
                options: {
                    destination: target.options.destination,
                },
                target: target.target,
            };
        case "file":
            return {
                level: target.levelOverride,
                options: {
                    append: target.options.append,
                    colorize: false,
                    destination: target.options.destination,
                    mkdir: target.options.mkdir,
                    sync: target.options.sync ?? false,
                },
                target: "pino/file",
            };
        case "pretty":
            return {
                options: {
                    colorize: true,
                    destination: STDOUT_FILE_DESCRIPTOR,
                    ignore: "pid,hostname",
                    sync: target.sync,
                    translateTime: "SYS:standard",
                },
                target: "pino-pretty",
            };
        case "stdout":
            return {
                level: target.levelOverride,
                options: {
                    colorize: true,
                    destination: STDOUT_FILE_DESCRIPTOR,
                    sync: target.sync ?? false,
                },
                target: "pino/file",
            };
        
        default:
            return assertNever(target);
    }
}

export { createLoggerTransportTarget };
export type { LoggerTransportTarget };