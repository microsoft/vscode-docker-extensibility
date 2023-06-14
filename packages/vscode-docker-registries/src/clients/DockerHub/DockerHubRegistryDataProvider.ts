/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { LoginInformation } from '../../contracts/LoginInformation';
import { CommonRegistryDataProvider } from '../common/CommonRegistryDataProvider';
import { CommonRegistryRoot, CommonRegistry, CommonRepository, CommonTag } from '../common/models';

export class DockerHubRegistryDataProvider extends CommonRegistryDataProvider {
    public readonly label: string = 'Docker Hub';
    public readonly description: undefined;
    public readonly icon: undefined; // TODO

    public async getRegistries(root: CommonRegistryRoot): Promise<CommonRegistry[]> {
        throw new Error("Method not implemented.");
    }

    public async getRepositories(registry: CommonRegistry): Promise<CommonRepository[]> {
        throw new Error("Method not implemented.");
    }

    public async getTags(repository: CommonRepository): Promise<CommonTag[]> {
        throw new Error("Method not implemented.");
    }

    public getLoginInformation(): LoginInformation {
        throw new Error("Method not implemented.");
    }
}
