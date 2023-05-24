/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { CommonRegistryDataProvider } from '../common/CommonRegistryDataProvider';
import { CommonRegistry, CommonRegistryItem, CommonRegistryRoot, CommonRepository, CommonTag } from '../common/models';
import { AuthenticationProvider } from '../../contracts/AuthenticationProvider';

export interface V2RegistryItem extends CommonRegistryItem {
    readonly registryRootUri: vscode.Uri;
}

export type V2RegistryRoot = CommonRegistryRoot & V2RegistryItem;
export type V2Registry = CommonRegistry & V2RegistryItem;
export type V2Repository = CommonRepository & V2RegistryItem;
export type V2Tag = CommonTag & V2RegistryItem;

export abstract class RegistryV2DataProvider extends CommonRegistryDataProvider {
    public constructor(
        public readonly label: string,
        private readonly authenticationProvider: AuthenticationProvider,
        public readonly description?: string,
        public readonly icon?: vscode.ThemeIcon,
    ) {
        super();
    }

    public abstract getRegistries(root: V2RegistryRoot): V2Registry[] | Promise<V2Registry[]>;

    public getRepositories(registry: V2Registry): Promise<V2Repository[]> {
        throw new Error('Method not implemented.');
    }

    public getTags(repository: V2Repository): Promise<V2Tag[]> {
        throw new Error('Method not implemented.');
    }

    public async onDisconnect(): Promise<void> {
        if (this.authenticationProvider.onDisconnect) {
            return await this.authenticationProvider.onDisconnect();
        }
    }
}
