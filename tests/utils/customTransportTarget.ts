import { appendFile } from "node:fs/promises";
import { Writable } from "node:stream";

interface CustomTargetOptions {
    destination: string;
}

function target(options: CustomTargetOptions) {
    return new Writable({
        write(chunk, _encoding, callback) {
            appendFile(
                options.destination,
                `${chunk}\n`,
            )
                .then(() => { callback() })
                .catch(callback);
        }
    });
}

export default target;