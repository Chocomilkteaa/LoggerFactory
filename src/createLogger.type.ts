import type pino from "pino";

type AppLogger = pino.Logger;

interface CreateLoggerConfigOptions {
    minLogLevel?: pino.LevelWithSilent;
    redactPaths?: string[];
    name?: string;
}

interface CreateLoggerConfigReturn {
    options: pino.LoggerOptions;
}

export type { CreateLoggerConfigOptions, CreateLoggerConfigReturn, AppLogger };