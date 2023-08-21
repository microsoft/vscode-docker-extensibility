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
    readonly baseUrl: vscode.Uri;
}

export type V2RegistryRoot = CommonRegistryRoot;
export type V2Registry = CommonRegistry & V2RegistryItem;
export type V2Repository = CommonRepository & V2RegistryItem;
export type V2Tag = CommonTag & V2RegistryItem;

interface ManifestHistory {
    v1Compatibility: string; // stringified ManifestHistoryV1Compatibility
}

interface ManifestHistoryV1Compatibility {
    created: string;
}

interface Manifest {
    history: ManifestHistory[];
}

export abstract class RegistryV2DataProvider extends CommonRegistryDataProvider {
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
            authenticationProvider: this.getAuthenticationProvider(registry),
            method: 'GET',
            registryUri: registry.baseUrl,
            path: ['v2', '_catalog'],
            scopes: ['registry:catalog:*'],
        });

        const results: V2Repository[] = [];

        for (const repository of catalogResponse.body?.repositories || []) {
            results.push({
                parent: registry,
                baseUrl: registry.baseUrl,
                label: repository,
                type: 'commonrepository',
            });
        }

        return results;
    }

    public async getTags(repository: V2Repository): Promise<V2Tag[]> {
        const tagsResponse = await registryV2Request<{ tags: string[] }>({
            authenticationProvider: this.getAuthenticationProvider(repository),
            method: 'GET',
            registryUri: repository.baseUrl,
            path: ['v2', repository.label, 'tags', 'list'],
            scopes: [`repository:${repository.label}:pull`],
            throwOnFailure: true,
        });

        const results: V2Tag[] = [];

        for (const tag of tagsResponse.body?.tags || []) {
            results.push({
                parent: repository,
                baseUrl: repository.baseUrl,
                label: tag,
                type: 'commontag',
                additionalContextValues: ['registryV2Tag'],
                createdAt: await this.getTagDetails(repository, tag),
            });
        }

        return results;
    }

    public getLoginInformation(item: V2RegistryItem): Promise<LoginInformation> {
        const authenticationProvider = this.getAuthenticationProvider(item);
        if (authenticationProvider.getLoginInformation) {
            return authenticationProvider.getLoginInformation();
        }

        throw new Error(vscode.l10n.t('Authentication provider {0} does not support getting login information.', authenticationProvider));
    }

    protected async getTagDetails(repository: V2Repository, tag: string): Promise<Date | undefined> {
        const tagDetailResponse = await registryV2Request<Manifest>({
            authenticationProvider: this.getAuthenticationProvider(repository),
            method: 'GET',
            registryUri: repository.baseUrl,
            path: ['v2', repository.label, 'manifests', tag],
            scopes: [`repository:${repository.label}:pull`]
        });

        const history = <ManifestHistoryV1Compatibility>JSON.parse(tagDetailResponse.body?.history?.[0]?.v1Compatibility || '{}');
        return history?.created ? new Date(history.created) : undefined;
    }

    protected abstract getAuthenticationProvider(item: V2RegistryItem): AuthenticationProvider<never>;
}
