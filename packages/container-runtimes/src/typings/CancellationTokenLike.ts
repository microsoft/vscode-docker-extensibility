/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from 'vscode';
import type * as jsonrpc from 'vscode-jsonrpc';
import { DisposableLike } from './DisposableLike';
import { EventLike } from './EventLike';

/**
 * Defined to reflect the fact that the cancellation tokens could be from either `vscode`
 * (in the case of VSCode extensions), or `vscode-jsonrpc` (in the case of ServiceHub
 * workers in VS).
 */
export type CancellationTokenLike = vscode.CancellationToken | jsonrpc.CancellationToken;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CancellationTokenLike {
    /**
     * An instance of {@link CancellationTokenLike} that will never actually cancel, but meets the interface
     */
    export const None: CancellationTokenLike = Object.freeze({
        isCancellationRequested: false,
        onCancellationRequested: EventLike.None,
    });

    /**
     * An instance of {@link CancellationTokenLike} that is already cancelled and will instantly fire the event back
     */
    export const Cancelled: CancellationTokenLike = Object.freeze({
        isCancellationRequested: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onCancellationRequested: (listener: (e: any) => any) => {
            listener(undefined);
            return DisposableLike.None;
        }
    });
}
