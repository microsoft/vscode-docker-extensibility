/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { GitHubAuthenticationProvider } from './GitHubAuthenticationProvider';
import { MonolithRegistryV2DataProvider } from '../Monolith/MonolithRegistryV2DataProvider';

export class GitHubRegistryDataProvider extends MonolithRegistryV2DataProvider {
    public constructor(storageMemento: vscode.Memento, secretStore: vscode.SecretStorage) {
        super('GitHub',
            new GitHubAuthenticationProvider(secretStore),
            storageMemento,
            'ConnectedGitHubRepositories',
            undefined,
            new vscode.ThemeIcon('github')
        );
    }
}
