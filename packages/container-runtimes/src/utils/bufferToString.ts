/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export async function bufferToString(buffer: Buffer, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    const rawString = buffer.toString(encoding);
    // Remove non-printing control characters and trailing newlines
    // eslint-disable-next-line no-control-regex
    return rawString.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F]|\r?\n$/g, '');
}
