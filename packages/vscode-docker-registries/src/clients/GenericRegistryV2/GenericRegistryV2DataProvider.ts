/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RegistryV2DataProvider, V2Registry, V2RegistryItem } from '../RegistryV2/RegistryV2DataProvider';
import { CommonRegistryRoot } from '../common/models';

export class GenericRegistryV2DataProvider extends RegistryV2DataProvider {
    public readonly id = 'vscode-docker.genericRegistryV2DataProvider';
    public readonly label = 'Generic Registry V2';
    public readonly description: undefined;
    public readonly icon = { light: 'resources/light/docker.svg', dark: 'resources/dark/docker.svg' };

    public async getRegistries(root: CommonRegistryRoot | V2RegistryItem): Promise<V2Registry[]> {
        throw new Error('Method not implemented.');
    }
}
