/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from 'vscode';
import type * as jsonrpc from 'vscode-jsonrpc';

/**
 * Defined to reflect the fact that the disposables could be from either `vscode`
 * (in the case of VSCode extensions), or `vscode-jsonrpc` (in the case of ServiceHub
 * workers in VS).
 */
export type DisposableLike = vscode.Disposable | jsonrpc.Disposable;
