/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DefaultRegistryDataProvider } from '../default/DefaultRegistryDataProvider';
import { DefaultRegistryItem } from '../default/Models';

export interface V2RegistryItem extends DefaultRegistryItem {
    readonly rootUri: vscode.Uri;
}

export abstract class RegistryV2DataProvider extends DefaultRegistryDataProvider<V2RegistryItem> {
    public constructor(
        public readonly label: string,
        private readonly sessionCallback: (scopes: string[], options?: vscode.AuthenticationGetSessionOptions) => Promise<vscode.AuthenticationSession>,
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
