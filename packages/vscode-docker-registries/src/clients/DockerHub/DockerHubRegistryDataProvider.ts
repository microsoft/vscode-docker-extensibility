/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerHubAuthProvider } from '../../auth/DockerHubAuthProvider';
import { LoginInformation } from '../../contracts/BasicCredentials';
import { httpRequest } from '../../utils/httpRequest';
import { CommonRegistryDataProvider } from '../common/CommonRegistryDataProvider';
import { CommonRegistryRoot, CommonRegistry, CommonRepository, CommonTag } from '../common/models';

import * as vscode from 'vscode';

const DockerHubUrl = 'https://hub.docker.com/';

export class DockerHubRegistryDataProvider extends CommonRegistryDataProvider {
    public readonly id: string = 'vscode-docker.dockerHub';
    public readonly label: string = 'Docker Hub';
    public readonly description: undefined;
    public readonly icon = { light: 'resources/light/docker.svg', dark: 'resources/dark/docker.svg' };

    public constructor(
        private readonly authenticationProvider: DockerHubAuthProvider,
        private readonly storageMemento: vscode.Memento,
    ) {
        super();
    }

    public getRoot(): CommonRegistryRoot {
        return {
            parent: undefined,
            label: this.label,
            icon: this.icon,
            type: 'commonroot',
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
            });
        }

        return results;
    }

    public async getRepositories(registry: CommonRegistry): Promise<CommonRepository[]> {
        const requestUrl = vscode.Uri.parse(DockerHubUrl)
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
                label: `${registry.label}/${repository.name}`,
                type: 'commonrepository',
            });
        }

        return results;
    }

    public async getTags(repository: CommonRepository): Promise<CommonTag[]> {
        const requestUrl = vscode.Uri.parse(DockerHubUrl)
            .with({ path: `v2/repositories/${repository.label}/tags` });

        const response = await httpRequest<{ results: [{ name: string; }] }>(requestUrl.toString(), {
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
            });
        }

        return results;
    }

    public async getLoginInformation(): Promise<LoginInformation> {
        const creds = await this.authenticationProvider.getBasicCredentials();
        return {
            server: DockerHubUrl,
            username: creds.username,
            secret: creds.secret,
        };
    }

    private async getNamespaces(): Promise<string[]> {
        const requestUrl = vscode.Uri.parse(DockerHubUrl)
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
        const requestUrl = vscode.Uri.parse(DockerHubUrl)
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
