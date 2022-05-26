/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from 'vscode';
import type * as jsonrpc from 'vscode-jsonrpc';

export type CancellationTokenLike = vscode.CancellationToken | jsonrpc.CancellationToken;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CancellationTokenLike {
    export const None: CancellationTokenLike = {
        isCancellationRequested: false,
        onCancellationRequested: () => {
            return {
                dispose: () => {
                    // Noop, not a real registration
                }
            };
        },
    };
}
