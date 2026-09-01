import build from "pino-abstract-transport";

interface CreateCustomLoggerTransportTargetOptions<TInput, TOutput, TOptions> {
  close?: () => Promise<void> | void;
  flush?: () => Promise<void> | void;
  onError?: (error: unknown, input: TInput) => Promise<void> | void;
  options: TOptions;
  parse: (input: TInput) => TOutput;
  write: (value: TOutput) => Promise<void> | void;
}

function defaultHandleError(error: unknown, input: unknown): Promise<void> | void {
  console.error(error, input);
}

function createCustomLoggerTransportTarget<TInput, TOutput, TOptions>({
  close,
  flush,
  onError = defaultHandleError,
  parse,
  write,
}: CreateCustomLoggerTransportTargetOptions<TInput, TOutput, TOptions>) {
  return build(
    async (source) => {
      for await (const chunk of source) {
        try {
          const parsed = parse(chunk as TInput);
          await write(parsed);
        } catch (error) {
          await onError(error, chunk as TInput);
        }
      }
    },
    {
      async close() {
        await flush?.();
        await close?.();
      },
    },
  );
}

export { createCustomLoggerTransportTarget };
export type { CreateCustomLoggerTransportTargetOptions };
