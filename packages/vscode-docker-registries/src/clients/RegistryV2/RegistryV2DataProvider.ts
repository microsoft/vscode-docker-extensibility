/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { CommonRegistryDataProvider } from '../common/CommonRegistryDataProvider';
import { CommonRegistryItem } from '../common/models';
import { AuthenticationCallback } from './models';

export interface V2RegistryItem extends CommonRegistryItem {
    readonly registryRootUri: vscode.Uri;
}

export abstract class RegistryV2DataProvider extends CommonRegistryDataProvider<V2RegistryItem> {
    public constructor(
        public readonly label: string,
        private readonly authenticationCallback: AuthenticationCallback,
        public readonly description?: string,
        public readonly icon?: vscode.ThemeIcon,
    ) {
        super();
    }

    public abstract getRegistries(): V2RegistryItem[] | Promise<V2RegistryItem[]>;

    public getRepositories(registry: V2RegistryItem): Promise<V2RegistryItem[]> {
        throw new Error('Method not implemented.');
    }

    public getTags(repository: V2RegistryItem): Promise<V2RegistryItem[]> {
        throw new Error('Method not implemented.');
    }
}
