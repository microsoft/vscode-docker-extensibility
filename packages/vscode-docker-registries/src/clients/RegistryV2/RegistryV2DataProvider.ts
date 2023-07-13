/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { CommonRegistryDataProvider } from '../Common/CommonRegistryDataProvider';
import { CommonRegistry, CommonRegistryItem, CommonRegistryRoot, CommonRepository, CommonTag } from '../Common/models';
import { AuthenticationProvider } from '../../contracts/AuthenticationProvider';
import { LoginInformation } from '../../contracts/BasicCredentials';
import { registryV2Request } from './registryV2Request';

export interface V2RegistryItem extends CommonRegistryItem {
    readonly registryUri: vscode.Uri;
}

export type V2RegistryRoot = CommonRegistryRoot;
export type V2Registry = CommonRegistry & V2RegistryItem;
export type V2Repository = CommonRepository & V2RegistryItem;
export type V2Tag = CommonTag & V2RegistryItem;

export abstract class RegistryV2DataProvider extends CommonRegistryDataProvider {
    public constructor(
        protected readonly authenticationProvider: AuthenticationProvider<never>,
    ) {
        super();
    }

    public getRoot(): V2RegistryRoot {
        return {
            parent: undefined,
            label: this.label,
            type: 'commonroot',
            iconPath: this.iconPath,
        };
    }

    public abstract getRegistries(root: V2RegistryRoot | V2RegistryItem): V2Registry[] | Promise<V2Registry[]>;

    public async getRepositories(registry: V2Registry): Promise<V2Repository[]> {
        const catalogResponse = await registryV2Request<{ repositories: string[] }>({
            authenticationProvider: this.authenticationProvider,
            method: 'GET',
            registryUri: registry.registryUri,
            path: ['v2', '_catalog'],
            scopes: ['registry:catalog:*']
        });

        const results: V2Repository[] = [];

        for (const repository of catalogResponse.body?.repositories || []) {
            results.push({
                parent: registry,
                registryUri: registry.registryUri,
                label: repository,
                type: 'commonrepository',
            });
        }

        return results;
    }

    public async getTags(repository: V2Repository): Promise<V2Tag[]> {
        const tagsResponse = await registryV2Request<{ tags: string[] }>({
            authenticationProvider: this.authenticationProvider,
            method: 'GET',
            registryUri: repository.registryUri,
            path: ['v2', repository.label, 'tags', 'list'],
            scopes: [`repository:${repository.label}:'pull'`]
        });

        const results: V2Tag[] = [];

        for (const tag of tagsResponse.body?.tags || []) {
            results.push({
                parent: repository,
                registryUri: repository.registryUri,
                label: tag,
                type: 'commontag',
            });
        }

        return results;
    }

    public getLoginInformation(): Promise<LoginInformation> {
        if (this.authenticationProvider.getLoginInformation) {
            return this.authenticationProvider.getLoginInformation();
        }

        throw new Error(vscode.l10n.t('Authentication provider {0} does not support getting login information.', this.authenticationProvider));
    }
}
