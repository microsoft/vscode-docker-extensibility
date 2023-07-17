/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { BasicOAuthProvider, CommonRegistryDataProvider, ResponseLike, httpRequest } from '@microsoft/vscode-docker-registries';
import { CommonRegistryRoot, CommonRegistryItem, CommonRegistry, CommonRepository, CommonTag } from '@microsoft/vscode-docker-registries/lib/clients/Common/models';

const GitLabBaseUrl = vscode.Uri.parse('https://gitlab.com/');

export class GitLabRegistryDataProvider extends CommonRegistryDataProvider {
    public readonly id: string = 'vscode-gitlab.gitLabContainerRegistry';
    public readonly label: string = vscode.l10n.t('GitLab');
    public readonly iconPath: vscode.Uri;
    public readonly description = vscode.l10n.t('GitLab Container Registry');

    private readonly authenticationProvider: BasicOAuthProvider;

    public constructor(private readonly extensionContext: vscode.ExtensionContext) {
        super();

        this.iconPath = vscode.Uri.joinPath(extensionContext.extensionUri, 'resources', 'gitlab.svg');
        this.authenticationProvider = new BasicOAuthProvider(this.extensionContext.globalState, this.extensionContext.secrets, GitLabBaseUrl);
    }

    public getRoot(): CommonRegistryRoot {
        return {
            parent: undefined,
            label: this.label,
            iconPath: this.iconPath,
            type: 'commonroot',
        };
    }

    public async getRegistries(root: CommonRegistryItem | CommonRegistryRoot): Promise<CommonRegistry[]> {
        const results: CommonRegistry[] = [];

        let nextLink: string | undefined = undefined;

        do {
            const requestUrl = nextLink || GitLabBaseUrl.with(
                { path: 'api/v4/projects', query: 'simple=true&membership=true&per_page=100' }
            );

            // eslint-disable-next-line @typescript-eslint/naming-convention
            const response = await this.httpRequest<{ path_with_namespace: string }[]>(requestUrl);

            // TODO: get next link from response
            // TODO: validate paging

            for (const project of await response.json()) {
                results.push({
                    label: project.path_with_namespace,
                    parent: root,
                    type: 'commonregistry',
                });
            }
        } while (!!nextLink);

        return results;
    }

    public async getRepositories(registry: CommonRegistry): Promise<CommonRepository[]> {
        throw new Error('Method not implemented.');
    }

    public async getTags(repository: CommonRepository): Promise<CommonTag[]> {
        throw new Error('Method not implemented.');
    }

    private async httpRequest<TResponse>(requestUrl: vscode.Uri): Promise<ResponseLike<TResponse>> {
        const session = await this.authenticationProvider.getSession([]);
        return await httpRequest<TResponse>(requestUrl.toString(), {
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'PRIVATE-TOKEN': session.accessToken,
            }
        });
    }
}
