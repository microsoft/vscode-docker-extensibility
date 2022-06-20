/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as stream from 'stream';

export class AccumulatorStream extends stream.PassThrough {
    private accumulatedOutput: string = '';
    public readonly output: Promise<string>;

    public constructor(options?: Omit<stream.TransformOptions, 'transform'>) {
        super({
            ...options,
            transform: (chunk, encoding, callback) => {
                this.accumulatedOutput += chunk.toString();
                callback(chunk);
            },
        });

        this.output = new Promise<string>((resolve, reject) => {
            this.on('end', () => {
                resolve(this.accumulatedOutput);
            });

            this.on('error', (err) => {
                reject(err);
            });
        });
    }
}
