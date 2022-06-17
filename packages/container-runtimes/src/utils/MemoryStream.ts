/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as stream from 'stream';

export class MemoryStream extends stream.PassThrough {
    public async getBytes(): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];

            this.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });

            this.on('end', () => {
                resolve(Buffer.concat(chunks));
            });

            this.on('error', (err) => {
                reject(err);
            });
        });
    }

    public async getString(encoding?: BufferEncoding): Promise<string> {
        return (await this.getBytes()).toString(encoding);
    }
}
