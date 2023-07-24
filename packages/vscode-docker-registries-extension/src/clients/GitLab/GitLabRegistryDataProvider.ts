/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { BasicOAuthProvider, CommonRegistryDataProvider, ResponseLike, httpRequest, RegistryWizardContext, RegistryWizard, RegistryWizardUsernamePromptStep, RegistryWizardSecretPromptStep, BasicCredentials } from '@microsoft/vscode-docker-registries';
import { CommonRegistryRoot, CommonRegistryItem, CommonRegistry, CommonRepository, CommonTag } from '@microsoft/vscode-docker-registries/lib/clients/Common/models';
import { GitLabAuthProvider } from './GitLabAuthProvider';

// eslint-disable-next-line @typescript-eslint/naming-convention
const GitLabBaseUrl = vscode.Uri.parse('https://gitlab.com/');
// eslint-disable-next-line @typescript-eslint/naming-convention
const GitLabPageSize = 100;

interface GitLabRegistry extends CommonRegistry {
    projectId: number;
}

interface GitLabRepository extends CommonRepository {
    repositoryId: number;
}

export class GitLabRegistryDataProvider extends CommonRegistryDataProvider {
    public readonly id: string = 'vscode-gitlab.gitLabContainerRegistry';
    public readonly label: string = vscode.l10n.t('GitLab');
    public readonly iconPath: vscode.Uri;
    public readonly description = vscode.l10n.t('GitLab Container Registry');
    private readonly authenticationProvider: GitLabAuthProvider;

    public constructor(private readonly extensionContext: vscode.ExtensionContext) {
        super();
        this.iconPath = vscode.Uri.joinPath(extensionContext.extensionUri, 'resources', 'gitlab.svg');
        this.authenticationProvider = new GitLabAuthProvider(this.extensionContext.globalState, this.extensionContext.secrets);
    }

    public async onConnect(): Promise<void> {
        const wizardContext: RegistryWizardContext = {
            usernamePrompt: vscode.l10n.t('GitLab Username'),
            secretPrompt: vscode.l10n.t('GitLab Personal Access Token'),
        };

        const wizard = new RegistryWizard(
            wizardContext,
            [
                new RegistryWizardUsernamePromptStep(),
                new RegistryWizardSecretPromptStep(),
            ],
            new vscode.CancellationTokenSource().token
        );

        await wizard.prompt();
        const credentials: BasicCredentials = {
            username: wizardContext.username || '',
            secret: wizardContext.secret || '',
        };

        this.authenticationProvider.storeBasicCredentials(credentials);
    }

    public async onDisconnect(): Promise<void> {
        this.authenticationProvider.removeSession();
    }

    public getRoot(): CommonRegistryRoot {
        return {
            parent: undefined,
            label: this.label,
            iconPath: this.iconPath,
            type: 'commonroot',
        };
    }

    public async getRegistries(root: CommonRegistryItem | CommonRegistryRoot): Promise<GitLabRegistry[]> {
        const results: GitLabRegistry[] = [];

        let nextLink: string | undefined = undefined;

        do {
            const requestUrl = nextLink || GitLabBaseUrl.with(
                { path: 'api/v4/projects', query: `simple=true&membership=true&per_page=${GitLabPageSize}` }
            );

            // eslint-disable-next-line @typescript-eslint/naming-convention
            const response = await this.httpRequest<{ path_with_namespace: string, id: number }[]>(requestUrl);

            // TODO: get next link from response
            // TODO: validate paging

            for (const project of await response.json()) {
                results.push({
                    label: project.path_with_namespace,
                    parent: root,
                    projectId: project.id,
                    type: 'commonregistry',
                });
            }
        } while (!!nextLink);

        return results;
    }

    public async getRepositories(registry: GitLabRegistry): Promise<GitLabRepository[]> {
        const results: GitLabRepository[] = [];

        let nextLink: string | undefined = undefined;

        do {
            const requestUrl = nextLink || GitLabBaseUrl.with(
                {
                    path: `api/v4/projects/${registry.projectId}/registry/repositories`, query: `simple=true&membership=true&per_page=${GitLabPageSize}`
                }
            );

            // eslint-disable-next-line @typescript-eslint/naming-convention
            const response = await this.httpRequest<{ name: string, id: number }[]>(requestUrl);

            // TODO: get next link from response

            for (const repository of await response.json()) {
                results.push({
                    // GitLab returns an empty repository name, if the project's namespace is the same as the repository
                    label: repository.name || registry.label,
                    parent: registry,
                    type: 'commonrepository',
                    repositoryId: repository.id,
                });

            }
        } while (!!nextLink);

        return results;
    }

    public async getTags(repository: CommonRepository): Promise<CommonTag[]> {
        const results: CommonTag[] = [];

        let nextLink: string | undefined = undefined;

        do {
            const requestUrl = nextLink || GitLabBaseUrl.with(
                {
                    path: `api/v4/projects/${repository.parent.projectId}/registry/repositories/${repository.repositoryId}/tags`, query: `simple=true&membership=true&per_page=${GitLabPageSize}`
                }
            );

            // eslint-disable-next-line @typescript-eslint/naming-convention
            const response = await this.httpRequest<{ name: string }[]>(requestUrl);

            // TODO: get next link from responsee

            for (const tag of await response.json()) {
                results.push({
                    label: tag.name,
                    parent: repository,
                    type: 'commontag',
                    createdAt: await this.getTagDetails(tag.name, repository) //TODO: make this show up in the UI
                });
            }
        } while (!!nextLink);

        return results;
    }

    private async getTagDetails(tag: string, repository: CommonRepository): Promise<string> {
        const requestUrl = GitLabBaseUrl.with(
            {
                path: `api/v4/projects/${repository.parent.projectId}/registry/repositories/${repository.repositoryId}/tags/${tag}`
            }
        );

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const response = await this.httpRequest<{ created_at: string }>(requestUrl);
        return (await response.json()).created_at;
    }

    private async httpRequest<TResponse>(requestUrl: vscode.Uri): Promise<ResponseLike<TResponse>> {
        const session = await this.authenticationProvider.getSession([]);
        return await httpRequest<TResponse>(requestUrl.toString(true), {
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'PRIVATE-TOKEN': session.accessToken,
            }
        });
    }
}
