import type pino from "pino";

interface CreateLoggerConfigOptions {
    minLogLevel?: pino.LevelWithSilent;
    name?: string;
    redactPaths?: string[];
}

interface CreateLoggerConfigReturn {
    options: pino.LoggerOptions;
}

export type { CreateLoggerConfigOptions, CreateLoggerConfigReturn };