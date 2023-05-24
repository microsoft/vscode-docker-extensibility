/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export type AuthenticationCallback = (scopes: string[], options?: vscode.AuthenticationGetSessionOptions) => Promise<vscode.AuthenticationSession & { type: string }>;

export interface AuthenticationProvider {
    getSession: AuthenticationCallback;
    onDisconnect?(): Promise<void>;
}
