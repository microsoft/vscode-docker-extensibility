/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as stream from 'stream';

export class AccumulatorStream extends stream.Writable {
    private accumulatedOutput: string = '';
    public readonly output: Promise<string>;

    public constructor(options?: Omit<stream.WritableOptions, 'write'>) {
        super({
            ...options,
            write: (chunk, encoding, callback) => {
                this.accumulatedOutput += chunk.toString();
                callback();
            },
        });

        this.output = new Promise<string>((resolve, reject) => {
            this.on('close', () => {
                resolve(this.accumulatedOutput);
            });

            this.on('error', (err) => {
                reject(err);
            });
        });
    }
}
