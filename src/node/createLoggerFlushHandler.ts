import type ThreadStream from "thread-stream";

async function flushStream(stream: ThreadStream): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      stream.flush((error) => {
        if (error != null) {
          reject(new Error(`Failed to flush stream: ${error.message}`));
          return;
        }

        resolve();
      });
    } catch (error) {
      reject(new Error(`Failed to flush stream: ${error instanceof Error ? error.message : JSON.stringify(error)}`));
    }
  });
}

function createLoggerFlushHandler(stream: ThreadStream | undefined): () => Promise<void> {
  return async (): Promise<void> => {
    if (stream == null) return Promise.resolve();

    return flushStream(stream);
  };
}

export { createLoggerFlushHandler };
