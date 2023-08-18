/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AuthenticationProvider } from '../../contracts/AuthenticationProvider';
import { isBasicOAuthProvider } from '../../auth/BasicOAuthProvider';
import { RequestLike, httpRequest } from '../../utils/httpRequest';

export interface RegistryV2RequestOptions {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    registryUri: vscode.Uri;
    path: string[];
    query?: Record<string, string>;
    scopes: string[];
    headers?: Record<string, string>;
    throwOnFailure?: boolean;
    authenticationProvider: AuthenticationProvider<vscode.AuthenticationGetSessionOptions>;
    sessionOptions?: vscode.AuthenticationGetSessionOptions;
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
            options.authenticationProvider.fallback(result.headers['www-authenticate']);
        } else {
            throw new Error(vscode.l10n.t('Request to {0} failed with response {1}: {2}', result.uri.toString(), result.status, result.statusText));
        }
    }

    return await registryV2RequestInternal<T>(options);
}

async function registryV2RequestInternal<T>(options: RegistryV2RequestOptions): Promise<RegistryV2Response<T>> {
    const query = new URLSearchParams(options.query);
    const uri = vscode.Uri.joinPath(options.registryUri, ...options.path).with({ query: query.toString() });

    const request: RequestLike = {
        headers: {
            accept: 'application/json',
            ...options.headers
        },
        method: options.method,
    };

    const auth = await options.authenticationProvider.getSession(options.scopes, options.sessionOptions);
    request.headers['Authorization'] = `${auth.type} ${auth.accessToken}`;

    const response = await httpRequest(uri.toString(true), request);
    const succeeded = response.status >= 200 && response.status < 300;

    if (options.throwOnFailure && !succeeded) {
        throw new Error(vscode.l10n.t('Request to {0} failed with response {1}: {2}', uri.toString(), response.status, response.statusText));
    }

    return {
        status: response.status,
        statusText: response.statusText,
        succeeded: succeeded,
        uri: uri,
        headers: response.headers,
        body: succeeded && (parseInt(response.headers['content-length']) || response.headers['transfer-encoding'] === 'chunked') ? await response.json() as T : undefined,
    };
}
