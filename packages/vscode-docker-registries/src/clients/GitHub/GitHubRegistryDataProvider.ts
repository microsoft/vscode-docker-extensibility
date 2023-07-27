/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { BasicOAuthProvider } from '../../auth/BasicOAuthProvider';
import { RegistryV2DataProvider, V2Registry, V2RegistryItem, V2RegistryRoot, V2Repository } from '../RegistryV2/RegistryV2DataProvider';
import { registryV2Request } from '../RegistryV2/registryV2Request';
import { AuthenticationProvider } from '../../contracts/AuthenticationProvider';
import { httpRequest } from '../../utils/httpRequest';

const GitHubContainerRegistryUri = vscode.Uri.parse('https://ghcr.io');

export class GitHubRegistryDataProvider extends RegistryV2DataProvider {
    public readonly id: string = 'vscode-docker.githubContainerRegistry';
    public readonly label: string = vscode.l10n.t('GitHub');
    public readonly description: string = vscode.l10n.t('GitHub Container Registry');
    public readonly iconPath: vscode.ThemeIcon = new vscode.ThemeIcon('github');

    private readonly authenticationProvider: BasicOAuthProvider;

    public constructor(private readonly extensionContext: vscode.ExtensionContext) {
        super();

        this.authenticationProvider = new BasicOAuthProvider(extensionContext.globalState, extensionContext.secrets, GitHubContainerRegistryUri);
    }

    public override async getRegistries(root: V2RegistryRoot): Promise<V2Registry[]> {
        const organizations = await this.getOrganizations();

        return organizations.map(org => (
            {
                parent: root,
                registryUri: GitHubContainerRegistryUri,
                label: org,
                type: 'commonregistry',
            }
        ));
    }

    // TODO: GitHub's catalog endpoint uses standard paging, so this could be simplified to call super.getRepositories with just the added query parameter for the last repository name
    public override async getRepositories(registry: V2Registry): Promise<V2Repository[]> {
        const originalSearchString = registry.label + '/';

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
                    additionalContextValues: ['genericregistryv2']
                });
            }
        } while (!foundAllInSearch);

        return results;
    }

    protected getAuthenticationProvider(item: V2RegistryItem): AuthenticationProvider<never> {
        return this.authenticationProvider;
    }

    private async getOrganizations(): Promise<string[]> {
        const results: string[] = [];

        const creds = await this.authenticationProvider.getBasicCredentials();
        results.push(creds.username);

        const requestUrl = vscode.Uri.parse('https://api.github.com/user/orgs');
        const response = await httpRequest<{ login: string }[]>(requestUrl.toString(), {
            headers: {
                'Accept': 'application/vnd.github+json',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'X-GitHub-Api-Version': '2022-11-28',
                'Authorization': `Bearer ${creds.secret}`
            }
        });

        for (const org of await response.json()) {
            results.push(org.login);
        }

        return results;
    }
}
