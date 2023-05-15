/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AuthenticationCallback } from './models';

export interface RegistryV2RequestOptions {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    registryRootUri: vscode.Uri;
    subPath: string;
    query: string;
    authenticationCallback: AuthenticationCallback;
}

export async function registryV2Request<T>(options: RegistryV2RequestOptions): Promise<T> {
    throw new Error('Not implemented');
}
