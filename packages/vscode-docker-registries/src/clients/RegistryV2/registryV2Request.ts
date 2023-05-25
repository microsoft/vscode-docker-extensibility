/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Request, default as fetch } from 'node-fetch';
import * as vscode from 'vscode';
import { AuthenticationProvider } from '../../contracts/AuthenticationProvider';
import { isBasicOAuthProvider } from '../../auth/BasicOAuthProvider';

export interface RegistryV2RequestOptions {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    registryRootUri: vscode.Uri;
    path: string[];
    scopes: string[];
    throwOnFailure?: boolean;
    authenticationProvider: AuthenticationProvider;
}

export interface RegistryV2Response<T> {
    status: number;
    statusText: string;
    succeeded: boolean;
    uri: vscode.Uri;
    headers: Record<string, string>;
    body: T | undefined;
}

export async function registryV2Request<T>(options: RegistryV2RequestOptions): Promise<RegistryV2Response<T>> {
    if (isBasicOAuthProvider(options.authenticationProvider) && !options.authenticationProvider.didFallback) {
        const result = await registryV2RequestInternal<T>({ ...options, throwOnFailure: false });
        if (result.succeeded) {
            return result;
        } else if (result.status === 401 && result.headers['www-authenticate']) {
            // TODO: parse and fall back
            options.authenticationProvider.fallback(result.headers['www-authenticate']);
        } else {
            throw new Error(vscode.l10n.t('Request to {0} failed with response {1}: {2}', result.uri.toString(), result.status, result.statusText));
        }
    }

    return await registryV2RequestInternal(options);

}

async function registryV2RequestInternal<T>(options: RegistryV2RequestOptions): Promise<RegistryV2Response<T>> {
    const uri = vscode.Uri.joinPath(options.registryRootUri, ...options.path);
    const request = new Request(uri.toString(), { method: options.method });
    await signRequest(request, options.authenticationProvider, options.scopes);

    const response = await fetch(request);

    if (options.throwOnFailure && (response.status < 200 || response.status >= 300)) {
        throw new Error(vscode.l10n.t('Request to {0} failed with response {1}: {2}', uri.toString(), response.status, response.statusText));
    }

    const headers: Record<string, string> = {};
    response.headers.forEach((value, name) => headers[name.toLowerCase()] = value);

    const contentLengthStr = response.headers.get('content-length');
    const contentLength = contentLengthStr ? Number(contentLengthStr) : 0;

    return {
        status: response.status,
        statusText: response.statusText,
        succeeded: response.status >= 200 && response.status < 300,
        uri: uri,
        headers: headers,
        body: contentLength ? await response.json() as T : undefined,
    };
}

async function signRequest(request: Request, authenticationProvider: AuthenticationProvider, scopes: string[]): Promise<void> {
    const auth = await authenticationProvider.getSession(scopes);
    request.headers.set('Authorization', `${auth.type} ${auth.accessToken}`);
}
