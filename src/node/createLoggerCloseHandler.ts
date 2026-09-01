import type ThreadStream from "thread-stream";

async function closeStream(stream: ThreadStream): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const resolveOnce = (): void => {
      if (settled) return;

      settled = true;
      cleanup();
      resolve();
    };

    const rejectOnce = (error: unknown): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new Error(`Failed to close stream: ${error instanceof Error ? error.message : JSON.stringify(error)}`));
    };

    const onClose = (): void => {
      resolveOnce();
    };

    const onError = (error: unknown): void => {
      rejectOnce(error);
    };

    const cleanup = (): void => {
      stream.off("close", onClose);
      stream.off("error", onError);
    };

    stream.once("close", onClose);
    stream.once("error", onError);

    try {
      stream.flushSync();
      stream.end();
    } catch (error) {
      rejectOnce(error);
    }
  });
}

function createLoggerCloseHandler(stream: ThreadStream | undefined): () => Promise<void> {
  let closePromise: null | Promise<void> = null;

  return async (): Promise<void> => {
    if (stream == null) return Promise.resolve();

    // Ensure that the close operation is only performed once
    closePromise ??= closeStream(stream);

    return closePromise;
  };
}

export { createLoggerCloseHandler };
