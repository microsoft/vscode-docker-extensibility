/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as stream from 'stream';

export class MemoryStream extends stream.Writable {
    private readonly chunks: Buffer[] = [];
    private encoding: BufferEncoding | undefined;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    public override _write(chunk: Buffer, encoding: BufferEncoding, callback: () => void): void {
        this.chunks.push(chunk);
        this.encoding = encoding;
        callback();
    }

    public getBytes(): Buffer {
        return Buffer.concat(this.chunks);
    }

    public getString(): string {
        // TODO: the encoding being sent is "buffer" which is not helpful
        return this.getBytes().toString('utf-8');
    }
}
