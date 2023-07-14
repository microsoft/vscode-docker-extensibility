/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AuthenticationProvider } from "@microsoft/vscode-docker-registries/src/contracts/AuthenticationProvider";
import { AzureSubscription } from '@microsoft/vscode-azext-azureauth';
import { BasicOAuthOptions, httpRequest } from '@microsoft/vscode-docker-registries';
import { log } from 'console';

export interface ACROAuthOptions extends BasicOAuthOptions {
    readonly subscription: AzureSubscription;
}

export class ACROAuthProvider implements AuthenticationProvider<ACROAuthOptions> {
    private refreshTokenCache = new Map<string, string>();

    public constructor() { }

    public async getSession(scopes: string[], options: ACROAuthOptions): Promise<vscode.AuthenticationSession & { type: string }> {
        const accessToken = await this.getAccessToken(options.subscription);

        let refreshToken: string;
        if (this.refreshTokenCache.has(options.service.toString())) {
            refreshToken = this.refreshTokenCache.get(options.service.toString())!;
        } else {
            refreshToken = await this.getRefreshTokenFromAccessToken(accessToken, options.service, options.subscription);
            this.refreshTokenCache.set(options.service.toString(), refreshToken);
        }

        const oauthToken = await this.getOAuthTokenFromRefreshToken(refreshToken, options.service, scopes.join(' '), options.subscription);
        const { sub, jti } = this.parseToken(oauthToken);

        return {
            id: jti,
            type: 'Bearer',
            accessToken: oauthToken,
            account: {
                label: sub,
                id: sub,
            },
            scopes: scopes,
        };
    }

    private parseToken(accessToken: string): { sub: string, jti: string } {
        const tokenParts = accessToken.split('.');
        const tokenBody = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
        return {
            sub: tokenBody.sub,
            jti: tokenBody.jti,
        };
    }

    private async getOAuthTokenFromRefreshToken(refreshToken: string, loginServer: vscode.Uri, scope: string, subscription: AzureSubscription): Promise<string> {
        const requestUrl = loginServer.with({ path: '/oauth2/token' });

        const requestBody = new URLSearchParams({
            /* eslint-disable @typescript-eslint/naming-convention */
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            service: loginServer.authority,
            scope: scope,
        });

        const response = await httpRequest<{ access_token: string }>(requestUrl.toString(), {
            method: 'POST',
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: requestBody,
        });

        return (await response.json()).access_token;
    }

    private async getRefreshTokenFromAccessToken(accessToken: string, loginServer: vscode.Uri, subscription: AzureSubscription): Promise<string> {
        const requestUrl = loginServer.with({ path: '/oauth2/exchange' });

        const requestBody = new URLSearchParams({
            /* eslint-disable @typescript-eslint/naming-convention */
            grant_type: 'access_token',
            access_token: accessToken,
            service: loginServer.authority,
            tenant: subscription.tenantId,
            /* eslint-enable @typescript-eslint/naming-convention */
        });

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const response = await httpRequest<{ refresh_token: string }>(requestUrl.toString(), {
            method: 'POST',
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: requestBody,
        });

        return (await response.json()).refresh_token;
    }

    private async getAccessToken(subscription: AzureSubscription): Promise<string> {
        const token = await subscription.credential.getToken([]);
        return token!.token;
    }
}
