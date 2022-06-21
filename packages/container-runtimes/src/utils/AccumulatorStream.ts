/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as stream from 'stream';

// Caller can pass any writable options except 'write' and 'writev'
type AccumulatorOptions = Omit<stream.WritableOptions, 'write' | 'writev'>;

export class AccumulatorStream extends stream.Writable {
    private readonly chunks: Buffer[] = [];
    private readonly streamEndPromise: Promise<void>;

    public constructor(options?: AccumulatorOptions) {
        super({
            ...options,
            write: (chunk: Buffer, encoding: never, callback: (err?: Error) => void) => {
                this.chunks.push(chunk);
                callback();
            },
        });

        this.streamEndPromise = new Promise<void>((resolve, reject) => {
            this.on('close', () => {
                resolve();
            });

            this.on('error', (err) => {
                reject(err);
            });
        });
    }

    public async getBytes(): Promise<Buffer> {
        await this.streamEndPromise;
        return Buffer.concat(this.chunks);
    }

    public async getString(encoding: BufferEncoding = 'utf-8'): Promise<string> {
        return (await this.getBytes()).toString(encoding);
    }
}
