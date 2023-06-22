/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { LoginInformation } from './BasicCredentials';

export interface AuthenticationProvider {
    getSession<TOptions extends vscode.AuthenticationGetSessionOptions | undefined = vscode.AuthenticationGetSessionOptions>(scopes: string[], options: TOptions): Promise<vscode.AuthenticationSession & { type: string }>;
    removeSession?(sessionId?: string): Promise<void>;

    getLoginInformation?(): Promise<LoginInformation>;
}
