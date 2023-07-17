/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { CommonRegistryDataProvider, RegistryDataProvider } from '@microsoft/vscode-docker-registries';
import { CommonRegistryRoot, CommonRegistryItem, CommonRegistry, CommonRepository, CommonTag } from '@microsoft/vscode-docker-registries/lib/clients/Common/models';

export class GitLabRegistryDataProvider extends CommonRegistryDataProvider {
    public readonly id: string = 'vscode-gitlab.gitLabContainerRegistry';
    public readonly label: string = vscode.l10n.t('GitLab');
    public readonly iconPath: vscode.Uri;
    public readonly description = vscode.l10n.t('GitLab Container Registry');

    public constructor(extensionContext: vscode.ExtensionContext) {
        super();

        this.iconPath = vscode.Uri.joinPath(extensionContext.extensionUri, 'resources', 'gitlab.svg');
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
        throw new Error('Method not implemented.');
    }

    public async getRepositories(registry: CommonRegistry): Promise<CommonRepository[]> {
        throw new Error('Method not implemented.');
    }

    public async getTags(repository: CommonRepository): Promise<CommonTag[]> {
        throw new Error('Method not implemented.');
    }
}
