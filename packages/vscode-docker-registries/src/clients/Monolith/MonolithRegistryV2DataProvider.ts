/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AuthenticationProvider } from '../../contracts/AuthenticationProvider';
import { RegistryV2DataProvider, V2Registry, V2RegistryItem, V2RegistryRoot } from '../RegistryV2/RegistryV2DataProvider';
import { ContextValueRegistryItem } from '../../contracts/RegistryItem';

export abstract class MonolithRegistryV2DataProvider extends RegistryV2DataProvider {
    protected constructor(
        registryRootUri: vscode.Uri,
        authenticationProvider: AuthenticationProvider,
        protected readonly storageMemento: vscode.Memento,
        protected readonly storageKey: string,
    ) {
        super(registryRootUri, authenticationProvider);
    }

    public override async getChildren(element?: V2RegistryItem | undefined): Promise<V2RegistryItem[]> {
        if (!element) {
            // Add to the context value to note that this is a monolithic registry
            return (await super.getChildren(element))
                .map(registry => ({ ...registry as V2RegistryRoot, additionalContextValues: ['monolith'] } as V2RegistryItem & ContextValueRegistryItem));
        } else {
            return super.getChildren(element) as Promise<V2RegistryItem[]>;
        }
    }

    public async getRegistries(root: V2RegistryRoot): Promise<V2Registry[]> {
        const registries: string[] = this.storageMemento.get(this.connectedRegistriesStorageKey, []);
        return registries.map(reg => {
            return {
                type: 'commonregistry',
                registryRootUri: root.registryRootUri,
                label: reg,
                additionalContextValues: ['monolithregistry'],
            } as V2Registry & ContextValueRegistryItem;
        });
    }

    public async connectRegistry(): Promise<void> {
        // TODO
        throw new Error('TODO: Not implemented');
    }

    public async disconnectRegistry(registry: V2Registry): Promise<void> {
        const registries: string[] = this.storageMemento
            .get(this.connectedRegistriesStorageKey, [])
            .filter(reg => reg !== registry.label);

        await this.storageMemento.update(this.connectedRegistriesStorageKey, registries);
    }

    private get connectedRegistriesStorageKey(): string {
        return `${this.storageKey}.ConnectedRegistries`;
    }
}
