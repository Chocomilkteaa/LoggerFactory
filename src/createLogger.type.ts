import type pino from "pino";

type AppLogger = pino.Logger;

interface CreateLoggerConfigOptions {
    minLogLevel?: pino.LevelWithSilent;
    name?: string;
    redactPaths?: string[];
}

interface CreateLoggerConfigReturn {
    options: pino.LoggerOptions;
}

export type { AppLogger, CreateLoggerConfigOptions, CreateLoggerConfigReturn };