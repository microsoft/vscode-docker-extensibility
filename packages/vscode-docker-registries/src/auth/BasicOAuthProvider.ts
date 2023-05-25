/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AuthenticationProvider } from '../contracts/AuthenticationProvider';

interface BasicCredentials {
    readonly username: string;
    readonly secret: string;
}

export class BasicOAuthProvider implements AuthenticationProvider {
    private oAuthEndpoint: vscode.Uri | undefined;
    private defaultScopes: string[] | undefined;
    private _didFallback: boolean = false;

    public constructor(private readonly getBasicCredentials: () => BasicCredentials | Promise<BasicCredentials>) { }

    public async getSession(scopes: string[], options?: vscode.AuthenticationGetSessionOptions): Promise<vscode.AuthenticationSession & { type: string }> {
        if (this.oAuthEndpoint === undefined) {
            const { username, secret } = await Promise.resolve(this.getBasicCredentials());
            return {
                id: 'basic',
                type: 'Basic',
                account: {
                    label: username,
                    id: username,
                },
                accessToken: secret,
                scopes: scopes,
            };
        } else {
            throw new Error('TODO: Not implemented');
        }
    }

    public fallback(wwwAuthenticateHeader: string): void {
        this._didFallback = true;
        throw new Error('TODO: Not implemented');
    }

    public get didFallback(): boolean {
        return this._didFallback;
    }
}

export function isBasicOAuthProvider(maybeProvider: unknown): maybeProvider is BasicOAuthProvider {
    return maybeProvider instanceof BasicOAuthProvider;
}
