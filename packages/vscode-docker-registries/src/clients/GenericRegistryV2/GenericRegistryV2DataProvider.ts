/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { RegistryV2DataProvider, V2Registry, V2RegistryItem } from '../RegistryV2/RegistryV2DataProvider';
import { CommonRegistryRoot } from '../Common/models';
import { AuthenticationProvider } from '../../contracts/AuthenticationProvider';

//const GenericV2StorageKey = 'GenericV2ContainerRegistry';

export class GenericRegistryV2DataProvider extends RegistryV2DataProvider {
    public readonly id = 'vscode-docker.genericRegistryV2DataProvider';
    public readonly label = 'Generic Registry V2';
    public readonly description: undefined;
    public readonly iconPath = new vscode.ThemeIcon('link');

    public async getRegistries(root: CommonRegistryRoot | V2RegistryItem): Promise<V2Registry[]> {
        throw new Error('Method not implemented.');
    }

    protected override getAuthenticationProvider(item: V2RegistryItem): AuthenticationProvider<never> {
        throw new Error('Method not implemented.');
    }
}
