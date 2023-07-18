/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BasicAuthProvider, LoginInformation } from '@microsoft/vscode-docker-registries';
import * as vscode from 'vscode';

export class GitLabAuthProvider extends BasicAuthProvider {
    public constructor(storageMemento: vscode.Memento, secretStorage: vscode.SecretStorage) {
        super(storageMemento, secretStorage, 'GitLab');
    }

    public async getSession(scopes: string[], options?: vscode.AuthenticationGetSessionOptions): Promise<vscode.AuthenticationSession & { type: string }> {
        const creds = await this.getBasicCredentials();

        return {
            id: creds.username,
            type: 'PRIVATE-TOKEN',
            accessToken: creds.secret,
            account: {
                label: creds.username,
                id: creds.username,
            },
            scopes: scopes,
        };
    }

    public async getLoginInformation?(): Promise<LoginInformation> {
        const credentials = await this.getBasicCredentials();

        return {
            server: 'gitlab.com',
            username: credentials.username,
            secret: credentials.secret,
        };
    }
}
