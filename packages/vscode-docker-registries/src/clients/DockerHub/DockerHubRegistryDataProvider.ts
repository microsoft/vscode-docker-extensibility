/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerHubAuthProvider } from '../../auth/DockerHubAuthProvider';
import { BasicCredentials, LoginInformation } from '../../contracts/BasicCredentials';
import { httpRequest } from '../../utils/httpRequest';
import { RegistryWizard } from '../../wizard/RegistryWizard';
import { RegistryWizardContext } from '../../wizard/RegistryWizardContext';
import { RegistryWizardSecretPromptStep, RegistryWizardUsernamePromptStep } from '../../wizard/RegistryWizardPromptStep';
import { CommonRegistryDataProvider } from '../Common/CommonRegistryDataProvider';
import { CommonRegistryRoot, CommonRegistry, CommonRepository, CommonTag, CommonRegistryItem } from '../Common/models';

import * as vscode from 'vscode';

export const DockerHubRequestUrl = vscode.Uri.parse('https://hub.docker.com/');
export const DockerHubRegistryUrl = vscode.Uri.parse('https://docker.io/');

export function isDockerHubRegistry(item: unknown): item is CommonRegistry {
    return !!item && typeof item === 'object' && (item as CommonRegistry).additionalContextValues?.includes('dockerHubRegistry') === true;
}

export function isDockerHubRepository(item: unknown): item is CommonRepository {
    return !!item && typeof item === 'object' && (item as CommonRepository).additionalContextValues?.includes('dockerHubRepository') === true;
}

export class DockerHubRegistryDataProvider extends CommonRegistryDataProvider {
    public readonly id: string = 'vscode-docker.dockerHub';
    public readonly label: string = 'Docker Hub';
    public readonly description: undefined;
    public readonly iconPath: { light: vscode.Uri, dark: vscode.Uri };

    private readonly authenticationProvider: DockerHubAuthProvider;

    public constructor(extensionContext: vscode.ExtensionContext) {
        super();
        this.authenticationProvider = new DockerHubAuthProvider(extensionContext.globalState, extensionContext.secrets);
        this.iconPath = {
            light: vscode.Uri.joinPath(extensionContext.extensionUri, 'resources', 'light', 'docker.svg'),
            dark: vscode.Uri.joinPath(extensionContext.extensionUri, 'resources', 'dark', 'docker.svg'),
        };
    }

    public async onConnect(): Promise<void> {
        const wizardContext: RegistryWizardContext = {
            usernamePrompt: vscode.l10n.t('Docker Hub Username'),
            secretPrompt: vscode.l10n.t('Docker Hub Password or Personal Access Token'),
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

    public getRoot(): CommonRegistryRoot {
        return {
            parent: undefined,
            label: this.label,
            iconPath: this.iconPath,
            type: 'commonroot',
            baseUrl: DockerHubRegistryUrl
        };
    }

    public async getRegistries(root: CommonRegistryRoot): Promise<CommonRegistry[]> {
        const orgsAndNamespaces = new Set<string>();

        (await this.getOrganizations()).forEach(org => orgsAndNamespaces.add(org));
        (await this.getNamespaces()).forEach(namespace => orgsAndNamespaces.add(namespace));

        const results: CommonRegistry[] = [];

        const sortedOrgsAndNamespaces = Array.from(orgsAndNamespaces).sort();

        for (const orgOrNamespace of sortedOrgsAndNamespaces) {
            results.push({
                parent: root,
                label: orgOrNamespace,
                type: 'commonregistry',
                additionalContextValues: ['dockerHubRegistry'],
                baseUrl: DockerHubRegistryUrl.with({ path: orgOrNamespace }),
            });
        }

        return results;
    }

    public async getRepositories(registry: CommonRegistry): Promise<CommonRepository[]> {
        const requestUrl = DockerHubRequestUrl
            .with({ path: `v2/repositories/${registry.label}` });

        const response = await httpRequest<{ results: [{ name: string; }] }>(requestUrl.toString(), {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${(await this.authenticationProvider.getSession([], {})).accessToken}`,
            }
        });

        const results: CommonRepository[] = [];

        for (const repository of (await response.json()).results) {
            results.push({
                parent: registry,
                label: `${repository.name}`,
                type: 'commonrepository',
                additionalContextValues: ['dockerHubRepository'],
                baseUrl: registry.baseUrl,
            });
        }

        return results;
    }

    public async getTags(repository: CommonRepository): Promise<CommonTag[]> {
        const requestUrl = DockerHubRequestUrl
            .with({ path: `v2/repositories/${repository.parent.label}/${repository.label}/tags` });

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const response = await httpRequest<{ results: [{ name: string, last_updated: string }] }>(requestUrl.toString(), {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${(await this.authenticationProvider.getSession([], {})).accessToken}`,
            }
        });

        const results: CommonTag[] = [];

        for (const tag of (await response.json()).results) {
            results.push({
                parent: repository,
                label: tag.name,
                type: 'commontag',
                additionalContextValues: ['dockerHubTag'],
                createdAt: new Date(tag.last_updated || ''),
                baseUrl: repository.baseUrl,
            });
        }

        return results;
    }

    public async getLoginInformation(item: CommonRegistryItem): Promise<LoginInformation> {
        return await this.authenticationProvider.getLoginInformation();
    }

    private async getNamespaces(): Promise<string[]> {
        const requestUrl = DockerHubRequestUrl
            .with({ path: `v2/repositories/namespaces` });

        const response = await httpRequest<{ namespaces: string[] }>(requestUrl.toString(), {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${(await this.authenticationProvider.getSession([], {})).accessToken}`,
            }
        });

        return (await response.json()).namespaces || [];
    }

    private async getOrganizations(): Promise<string[]> {
        const requestUrl = DockerHubRequestUrl
            .with({ path: `v2/user/orgs` });

        const response = await httpRequest<{ results: [{ orgname: string }] }>(requestUrl.toString(), {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${(await this.authenticationProvider.getSession([], {})).accessToken}`,
            }
        });

        return (await response.json()).results.map(org => org.orgname) || [];
    }
}
