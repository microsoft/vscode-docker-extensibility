/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { MonolithRegistryV2DataProvider } from '../Monolith/MonolithRegistryV2DataProvider';
import { BasicOAuthProvider } from '../../auth/BasicOAuthProvider';
import { V2Registry, V2Repository } from '../RegistryV2/RegistryV2DataProvider';

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

    public override async getRepositories(registry: V2Registry): Promise<V2Repository[]> {
        // TODO
        return [
            {
                registryRootUri: registry.registryRootUri,
                label: 'bwateratmsft/dotnet-accelerator',
                parent: registry,
                type: 'commonrepository',
            }
        ];
    }
}
