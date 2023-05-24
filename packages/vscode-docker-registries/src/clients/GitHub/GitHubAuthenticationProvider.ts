/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AuthenticationProvider } from '../../contracts/AuthenticationProvider';

const secretKey = 'ghcrPersonalAccessToken';

export class GitHubAuthenticationProvider implements AuthenticationProvider {
    public constructor(private readonly secretStore: vscode.SecretStorage) {

    }

    public async getSession(scopes: string[], options?: vscode.AuthenticationGetSessionOptions): Promise<vscode.AuthenticationSession & { type: string }> {
        throw new Error('Method not implemented.');
    }

    public async onDisconnect(): Promise<void> {
        await this.secretStore.delete(secretKey);
    }
}
