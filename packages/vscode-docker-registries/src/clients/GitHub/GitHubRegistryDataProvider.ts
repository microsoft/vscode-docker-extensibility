/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { BasicOAuthProvider } from '../../auth/BasicOAuthProvider';
import { RegistryV2DataProvider, V2Registry, V2RegistryItem, V2RegistryRoot, V2Repository, V2Tag } from '../RegistryV2/RegistryV2DataProvider';
import { registryV2Request } from '../RegistryV2/registryV2Request';
import { AuthenticationProvider } from '../../contracts/AuthenticationProvider';
import { httpRequest } from '../../utils/httpRequest';
import { RegistryWizardContext } from '../../wizard/RegistryWizardContext';
import { RegistryWizard } from '../../wizard/RegistryWizard';
import { RegistryWizardSecretPromptStep, RegistryWizardUsernamePromptStep } from '../../wizard/RegistryWizardPromptStep';
import { BasicCredentials } from '../../contracts/BasicCredentials';

const GitHubContainerRegistryUri = vscode.Uri.parse('https://ghcr.io');

interface Config {
    digest: string;
}
interface Blob {
    config: Config;
}

export function isGitHubRegistry(item: unknown): item is V2Registry {
    return !!item && typeof item === 'object' && (item as V2Registry).additionalContextValues?.includes('githubRegistry') === true;
}

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

    public async onConnect(): Promise<void> {
        const wizardContext: RegistryWizardContext = {
            usernamePrompt: vscode.l10n.t('GitHub Username'),
            secretPrompt: vscode.l10n.t('GitHub Personal Access Token (requires `repo` and `write:packages` scopes)'),
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

        await this.authenticationProvider.storeBasicCredentials(credentials);
    }

    public async onDisconnect(): Promise<void> {
        await this.authenticationProvider.removeSession();
    }

    public override async getRegistries(root: V2RegistryRoot): Promise<V2Registry[]> {
        const organizations = await this.getOrganizations();

        return organizations.map(org => (
            {
                parent: root,
                baseUrl: GitHubContainerRegistryUri,
                label: org,
                type: 'commonregistry',
                additionalContextValues: ['githubRegistry']
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
                registryUri: registry.baseUrl,
                path: ['v2', '_catalog'],
                query: {
                    n: '100',
                    last: nextSearchString
                },
                scopes: ['registry:catalog:*'],
                throwOnFailure: true,
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
                    baseUrl: registry.baseUrl,
                    label: repository,
                    type: 'commonrepository',
                });
            }
        } while (!foundAllInSearch);

        return results;
    }

    public async getTags(repository: V2Repository): Promise<V2Tag[]> {
        const tags = await super.getTags(repository);
        const tagsWithAdditionalContext: V2Tag[] = tags.map(tag => ({
            ...tag,
            additionalContextValues: ['githubRegistryTag']
        }));

        return tagsWithAdditionalContext;
    }

    protected getAuthenticationProvider(item: V2RegistryItem): AuthenticationProvider<never> {
        return this.authenticationProvider;
    }

    protected override async getTagDetails(repository: V2Repository, tag: string): Promise<Date | undefined> {
        const tagDetailResponse = await registryV2Request<Blob>({
            authenticationProvider: this.getAuthenticationProvider(repository),
            method: 'GET',
            registryUri: repository.baseUrl,
            path: ['v2', repository.label, 'manifests', tag],
            scopes: [`repository:${repository.label}:pull`]
        });

        const digest = tagDetailResponse.body?.config?.digest || '';

        if (digest) {
            const configFile = await registryV2Request<{ created: string }>({
                authenticationProvider: this.getAuthenticationProvider(repository),
                method: 'GET',
                registryUri: repository.baseUrl,
                path: ['v2', repository.label, 'blobs', digest],
                scopes: [`repository:${repository.label}:pull`]
            });

            return configFile.body?.created ? new Date(configFile.body.created) : undefined;
        }

        return undefined;
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
