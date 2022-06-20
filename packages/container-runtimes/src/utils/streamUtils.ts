/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Gets the full stream content in a buffer
 * @param stream The {@link NodeJS.ReadableStream} to read from
 * @returns A {@link Buffer} containing the full content of the stream
 */
export async function getBytes(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];

        stream.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
        });

        stream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });

        stream.on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Gets the full stream content in a string
 * @param stream The {@link NodeJS.ReadableStream} to read from
 * @param encoding (Optional) The {@link BufferEncoding} to use when converting to string
 * @returns A string containing the full content of the stream
 */
export async function getString(stream: NodeJS.ReadableStream, encoding?: BufferEncoding): Promise<string> {
    return (await getBytes(stream)).toString(encoding);
}
