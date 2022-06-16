/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as stream from 'stream';
import { spawn, SpawnOptions } from 'child_process';
import { ShellQuoting } from 'vscode';

import { CancellationTokenLike } from '../typings/CancellationTokenLike';
import { CancellationError } from './CancellationError';
import { ChildProcessError } from './ChildProcessError';
import { CommandLineArgs } from './commandLineBuilder';
import { MemoryStream } from './MemoryStream';

type CommonExtendedSpawnOptions = SpawnOptions & {
    shell?: boolean;
    onCommand?: (command: string) => void;
    cancellationToken?: CancellationTokenLike;
};

export type ExtendedSpawnOptions = CommonExtendedSpawnOptions & {
    onStdOut?: (data: string | Buffer) => void;
    onStdErr?: (data: string | Buffer) => void;
};

export type StreamSpawnOptions = CommonExtendedSpawnOptions & {
    stdinPipe?: stream.Readable;
    stdoutPipe?: stream.Writable;
    stderrPipe?: stream.Writable;
};

const isQuoted = (value: string): boolean => {
    if (value.length >= 2 && (value[0] === "'" || value[0] === '"') && value[value.length - 1] === value[0]) {
        return true;
    }

    return false;
};

export const powershellQuote = (args: CommandLineArgs): Array<string> => {
    return args.map((quotedArg) => {
        if (isQuoted(quotedArg.value)) {
            return quotedArg.value;
        }

        switch (quotedArg.quoting) {
            case ShellQuoting.Escape:
                return quotedArg.value.replace(/[ "'()]/g, (match) => `\`${match}`);
            case ShellQuoting.Weak:
                return `"${quotedArg.value}"`;
            case ShellQuoting.Strong:
                return `'${quotedArg.value}'`;
        }
    });
};

export const bashQuote = (args: CommandLineArgs): Array<string> => {
    return args.map((quotedArg) => {
        if (isQuoted(quotedArg.value)) {
            return quotedArg.value;
        }

        switch (quotedArg.quoting) {
            case ShellQuoting.Escape:
                return quotedArg.value.replace(/[ "']/g, (match) => `\\${match}`);
            case ShellQuoting.Weak:
                return `"${quotedArg.value}"`;
            case ShellQuoting.Strong:
                return `'${quotedArg.value}'`;
        }
    });
};

export async function spawnAsync(command: string, args: Array<string>, options: ExtendedSpawnOptions): Promise<string> {
    const stdOutStream = new MemoryStream();
    const stdErrStream = new MemoryStream();

    if (options.onStdOut) {
        stdOutStream.on('data', (chunk) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            options.onStdOut!(chunk.toString());
        });
    }

    if (options.onStdErr) {
        stdErrStream.on('data', (chunk) => {
            const data = chunk.toString();
            if (data.includes('screen size is bogus')) {
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            options.onStdErr!(data);
        });
    }

    // // Accumulate and report on stdout
    // stdOutStream.on('data', (chunk) => {
    //     const data = chunk.toString();
    //     output += data;

    //     if (options.onStdOut) {
    //         options.onStdOut(data);
    //     }
    // });

    // // Accumulate and report on stderr
    // stdErrStream.on('data', (chunk) => {
    //     const data = chunk.toString();
    //     if (data.includes('screen size is bogus')) {
    //         return;
    //     }

    //     error += data;

    //     if (options.onStdErr) {
    //         options.onStdErr(data);
    //     }
    // });

    try {
        const newOptions: StreamSpawnOptions & ExtendedSpawnOptions = {
            ...options,
            stdoutPipe: stdOutStream,
            stderrPipe: stdErrStream,
        };

        delete newOptions.onStdOut;
        delete newOptions.onStdErr;

        await spawnStreamAsync(command, args, newOptions);

        return stdOutStream.getString();
    } catch (err) {
        if (err instanceof ChildProcessError) {
            // A new error will be thrown with the output from stderr instead of a generic message
            throw new ChildProcessError(stdErrStream.getString(), err.code, err.signal);
        } else {
            // Otherwise rethrow
            throw err;
        }
    }
}

export async function spawnStreamAsync(command: string, args: Array<string>, options: StreamSpawnOptions): Promise<void> {
    const cancellationToken = options.cancellationToken || CancellationTokenLike.None;

    if (cancellationToken.isCancellationRequested) {
        throw new CancellationError('Command cancelled', cancellationToken);
    }

    if (options.onCommand) {
        options.onCommand([command, ...args].join(' '));
    }

    const childProcess = spawn(command, args, { shell: options.shell });

    if (options.stdinPipe) {
        options.stdinPipe.pipe(childProcess.stdin);
    }

    if (options.stdoutPipe) {
        childProcess.stdout.pipe(options.stdoutPipe);
    }

    if (options.stderrPipe) {
        childProcess.stderr.pipe(options.stderrPipe);
    }

    return new Promise<void>((resolve, reject) => {
        const disposable = cancellationToken.onCancellationRequested(() => {
            childProcess.removeAllListeners();
            childProcess.kill();
            reject(new CancellationError('Command cancelled', cancellationToken));
        });

        // Reject the promise on an error event
        childProcess.on('error', (err) => {
            disposable.dispose();
            reject(err);
        });

        // Complete the promise when the process exits
        childProcess.on('exit', (code, signal) => {
            disposable.dispose();
            if (code === 0) {
                resolve();
            } else {
                reject(new ChildProcessError(`Process exited with code ${code}`, code, signal));
            }
        });
    });
}
