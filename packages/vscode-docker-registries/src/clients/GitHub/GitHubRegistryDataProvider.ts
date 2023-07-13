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
    public readonly id: string = 'vscode-docker.githubContainerRegistry';
    public readonly label: string = vscode.l10n.t('GitHub');
    public readonly description: string = vscode.l10n.t('GitHub Container Registry');
    public readonly iconPath: vscode.ThemeIcon = new vscode.ThemeIcon('github');

    public constructor(extensionContext: vscode.ExtensionContext) {
        super(
            vscode.Uri.parse('https://ghcr.io'),
            new BasicOAuthProvider(extensionContext.globalState, extensionContext.secrets, GitHubStorageKey),
            extensionContext.globalState,
            GitHubStorageKey,
        );
    }

    public override async getRegistries(root: V2RegistryRoot): Promise<V2Registry[]> {
        const trackedRegistries = this.storageMemento.get<string[]>(`${GitHubStorageKey}.TrackedRegistries`, []);

        const results: V2Registry[] = [];

        for (const trackedRegistry of trackedRegistries) {
            results.push(
                {
                    parent: root,
                    registryUri: root.registryUri,
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
                registryUri: registry.registryUri,
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
                    parent: registry,
                    registryUri: registry.registryUri,
                    label: repository,
                    type: 'commonrepository',
                });
            }
        } while (!foundAllInSearch);

        return results;
    }
}
