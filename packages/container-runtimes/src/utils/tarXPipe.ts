/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as tar from 'tar';

/**
 * The `tar` package lacks a `pipe()` method, so this essentially implements that. This returns
 * a writeable stream, to which tarballed data must be written. In turn it will pipe the untarred
 * data to the destination stream.
 * NOTE: At most one entry in source tarball data will be sent to the output
 * @param destination The destination stream to pipe untarred data to
 * @returns A stream to write the tarballed data to
 */
export function tarXPipe(destination: NodeJS.WritableStream): NodeJS.WritableStream {
    let entryCounter = 0;
    return new tar.Parse(
        {
            filter: () => {
                return entryCounter < 1;
            },
            onentry: (entry: tar.ReadEntry) => {
                entryCounter++;
                entry.pipe(destination);
            },
        }
    );
}
