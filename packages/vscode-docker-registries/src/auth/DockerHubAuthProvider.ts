/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AuthenticationProvider } from '../contracts/AuthenticationProvider';
import { BasicCredentials } from '../contracts/BasicCredentials';
import { DockerHubUrl } from '../clients/DockerHub/DockerHubRegistryDataProvider';
import { httpRequest } from '../utils/httpRequest';

const StorageKey = 'DockerHub';

export class DockerHubAuthProvider implements AuthenticationProvider {
    // TODO: this token expires after a month, should we actually refresh it?
    #token: string | undefined;

    public constructor(private readonly storageMemento: vscode.Memento, private readonly secretStorage: vscode.SecretStorage) { }

    public async getSession(scopes: string[], options?: vscode.AuthenticationGetSessionOptions): Promise<vscode.AuthenticationSession & { type: string }> {
        const creds = await this.getBasicCredentials();

        if (!this.#token || options?.forceNewSession) {
            const requestUrl = vscode.Uri.parse(DockerHubUrl)
                .with({ path: `v2/users/login` });

            const response = await httpRequest<{ token: string }>(requestUrl.toString(), {
                method: 'POST',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: creds.username,
                    password: creds.secret,
                })
            });

            this.#token = (await response.json()).token;
        }

        return {
            id: creds.username,
            type: 'Bearer',
            accessToken: this.#token,
            account: {
                label: creds.username,
                id: creds.username,
            },
            scopes: scopes,
        };
    }

    public async getBasicCredentials(): Promise<BasicCredentials> {
        const username = this.storageMemento.get<string>(`${StorageKey}.username`);
        const secret = await this.secretStorage.get(`${StorageKey}.secret`);

        if (!username) {
            throw new Error(vscode.l10n.t('Could not load username for {0}', StorageKey));
        } else if (secret === undefined || secret === null) {
            // An empty string is allowed as a secret (but obviously not advisable)
            throw new Error(vscode.l10n.t('Could not load secret for {0}', StorageKey));
        }

        return {
            username,
            secret,
        };
    }

    public async removeSession(sessionId: string): Promise<void> {
        throw new Error('TODO: Method not implemented.');
    }
}
