/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AuthenticationProvider } from "@microsoft/vscode-docker-registries/src/contracts/AuthenticationProvider";

export interface ACROAuthOptions extends vscode.AuthenticationGetSessionOptions {
    readonly service: vscode.Uri;
}

export class ACROAuthProvider implements AuthenticationProvider {
    public async getSession<ACROAuthOptions>(scopes: string[], options?: ACROAuthOptions): Promise<vscode.AuthenticationSession & { type: string }> {
        throw new Error('TODO: Not implemented');
    }
}
