/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Request, default as fetch } from 'node-fetch';
import * as vscode from 'vscode';
import { AuthenticationCallback } from '../../contracts/AuthenticationProvider';

export interface RegistryV2RequestOptions {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    registryRootUri: vscode.Uri;
    path: string[];
    scopes: string[];
    throwOnFailure?: boolean;
    authenticationCallback: AuthenticationCallback;
}

export interface RegistryV2Response<T> {
    status: number;
    statusText: string;
    succeeded: boolean;
    headers: Record<string, string>;
    body: T | undefined;
}

export async function registryV2Request<T>(options: RegistryV2RequestOptions): Promise<RegistryV2Response<T>> {
    const uri = vscode.Uri.joinPath(options.registryRootUri, ...options.path);
    const request = new Request(uri.toString(), { method: options.method });
    await signRequest(request, options.authenticationCallback, options.scopes);

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
        headers: headers,
        body: contentLength ? await response.json() as T : undefined,
    };
}

async function signRequest(request: Request, authenticationCallback: AuthenticationCallback, scopes: string[]): Promise<void> {
    const auth = await authenticationCallback(scopes);
    request.headers.set('Authorization', `${auth.type} ${auth.accessToken}`);
}
