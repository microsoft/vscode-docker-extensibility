/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { LoginInformation } from '../../contracts/BasicCredentials';
import { CommonRegistryDataProvider } from '../common/CommonRegistryDataProvider';
import { CommonRegistryRoot, CommonRegistry, CommonRepository, CommonTag } from '../common/models';

import * as vscode from 'vscode';

export class DockerHubRegistryDataProvider extends CommonRegistryDataProvider {
    public readonly label: string = 'Docker Hub';
    public readonly description: undefined;
    public readonly icon: undefined; // TODO

    public constructor(
        private readonly authenticationProvider: vscode.AuthenticationProvider,
        private readonly storageMemento: vscode.Memento,
    ) {
        super();
    }

    public getRoot(): CommonRegistryRoot {
        throw new Error('TODO: Not implemented');
    }

    public async getRegistries(root: CommonRegistryRoot): Promise<CommonRegistry[]> {
        throw new Error('TODO: Not implemented');
    }

    public async getRepositories(registry: CommonRegistry): Promise<CommonRepository[]> {
        throw new Error('TODO: Not implemented');
    }

    public async getTags(repository: CommonRepository): Promise<CommonTag[]> {
        throw new Error('TODO: Not implemented');
    }

    public getLoginInformation(): LoginInformation {
        throw new Error('TODO: Not implemented');
    }
}
