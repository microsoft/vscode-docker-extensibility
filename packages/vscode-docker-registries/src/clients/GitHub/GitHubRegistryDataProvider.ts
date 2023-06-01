/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { MonolithRegistryV2DataProvider } from '../Monolith/MonolithRegistryV2DataProvider';
import { BasicOAuthProvider } from '../../auth/BasicOAuthProvider';

const GitHubStorageKey = 'GitHubContainerRegistry';

export class GitHubRegistryDataProvider extends MonolithRegistryV2DataProvider {
    public constructor(storageMemento: vscode.Memento, secretStore: vscode.SecretStorage) {
        super('GitHub',
            new BasicOAuthProvider(storageMemento, secretStore, GitHubStorageKey),
            storageMemento,
            GitHubStorageKey,
            undefined,
            new vscode.ThemeIcon('github')
        );
    }
}
