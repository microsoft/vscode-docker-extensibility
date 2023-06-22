/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { MonolithRegistryV2DataProvider } from '../Monolith/MonolithRegistryV2DataProvider';
import { BasicOAuthProvider } from '../../auth/BasicOAuthProvider';
import { V2Registry, V2RegistryRoot, V2Repository } from '../RegistryV2/RegistryV2DataProvider';
import { registryV2Request } from '../RegistryV2/registryV2Request';

const GitHubStorageKey = 'GitHubContainerRegistry';

export class GitHubRegistryDataProvider extends MonolithRegistryV2DataProvider {
    public constructor(storageMemento: vscode.Memento, secretStore: vscode.SecretStorage) {
        super(
            vscode.Uri.parse('https://ghcr.io'),
            new vscode.ThemeIcon('github'),
            'GitHub',
            new BasicOAuthProvider(storageMemento, secretStore, GitHubStorageKey),
            storageMemento,
            GitHubStorageKey,
            undefined,
        );
    }

    public override async getRegistries(root: V2RegistryRoot): Promise<V2Registry[]> {
        const trackedRegistries = this.storageMemento.get<string[]>(`${GitHubStorageKey}.TrackedRegistries`, []);

        const results: V2Registry[] = [];

        for (const trackedRegistry of trackedRegistries) {
            results.push(
                {
                    registryRootUri: root.registryRootUri,
                    label: trackedRegistry,
                    type: 'commonregistry',
                }
            );
        }

        return results;
    }

    public override async getRepositories(registry: V2Registry): Promise<V2Repository[]> {
        let originalSearchString: string;
        if (/\//i.test(registry.label)) {
            originalSearchString = registry.label.substring(0, registry.label.length - 1);
        } else {
            originalSearchString = registry.label + '/';
        }

        const results: V2Repository[] = [];
        let nextSearchString = originalSearchString;
        let foundAllInSearch = false;

        do {
            const catalogResponse = await registryV2Request<{ repositories: string[] }>({
                authenticationProvider: this.authenticationProvider,
                method: 'GET',
                registryRootUri: registry.registryRootUri,
                path: ['v2', '_catalog'],
                query: {
                    n: '100',
                    last: nextSearchString
                },
                scopes: ['registry:catalog:*']
            });


            for (const repository of catalogResponse.body?.repositories || []) {
                if (!repository.startsWith(originalSearchString)) {
                    foundAllInSearch = true;
                    break;
                } else {
                    nextSearchString = repository;
                }

                results.push({
                    registryRootUri: registry.registryRootUri,
                    label: repository,
                    type: 'commonrepository',
                });
            }
        } while (!foundAllInSearch);

        return results;
    }

    public connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    public disconnect(): Promise<void> {
        return (this.authenticationProvider as BasicOAuthProvider).removeSession();
    }
}
