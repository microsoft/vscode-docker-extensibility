/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as stream from 'stream';

export class MemoryStream extends stream.Writable {
    private readonly chunks: Buffer[] = [];
    private encoding: BufferEncoding | undefined;
    private readonly options: stream.WritableOptions;

    public constructor(options?: stream.WritableOptions) {
        super({
            ...options,
            write: (c, e, cb) => this.internalWrite(c, e, cb),
        });

        this.options = options || {};
        this.options.defaultEncoding ||= 'utf-8';
    }

    public internalWrite(chunk: Buffer, encoding: BufferEncoding | 'buffer', callback: () => void): void {
        this.chunks.push(chunk);

        // Unhelpfully, the encoding is sometimes `buffer` which is not a real encoding
        this.encoding = encoding === 'buffer' ? this.options.defaultEncoding : encoding;

        callback();
    }

    public getBytes(): Buffer {
        return Buffer.concat(this.chunks);
    }

    public getString(): string {
        return this.getBytes().toString(this.encoding);
    }
}
