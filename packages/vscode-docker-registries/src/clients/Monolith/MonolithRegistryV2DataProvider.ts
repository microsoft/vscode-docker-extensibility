/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { RegistryV2DataProvider, V2Registry, V2RegistryItem, V2RegistryRoot } from '../RegistryV2/RegistryV2DataProvider';
import { ContextValueRegistryItem } from '../../contracts/RegistryItem';
import { AuthenticationProvider } from '../../contracts/AuthenticationProvider';

export abstract class MonolithRegistryV2DataProvider extends RegistryV2DataProvider {
    protected constructor(
        authenticationProvider: AuthenticationProvider<never>,
        protected readonly registryRootUri: vscode.Uri,
        protected readonly storageMemento: vscode.Memento,
        protected readonly storageKey: string,
    ) {
        super(authenticationProvider);
    }

    public override async getChildren(element?: V2RegistryItem | undefined): Promise<V2RegistryItem[]> {
        if (!element) {
            // Add to the context value to note that this is a monolithic registry
            return (await super.getChildren(element))
                .map(registry => ({ ...registry as V2RegistryRoot, registryUri: this.registryRootUri, additionalContextValues: ['monolith'] } as V2RegistryItem & ContextValueRegistryItem));
        } else {
            return super.getChildren(element) as Promise<V2RegistryItem[]>;
        }
    }

    public async getRegistries(root: V2RegistryRoot): Promise<V2Registry[]> {
        const registries: string[] = this.storageMemento.get(this.trackedRegistriesStorageKey, []);
        return registries.map(reg => {
            return {
                type: 'commonregistry',
                registryUri: root.registryUri,
                label: reg,
                additionalContextValues: ['monolithregistry'],
            } as V2Registry & ContextValueRegistryItem;
        });
    }

    public async trackPseudoRegistry(): Promise<void> {
        // TODO
        throw new Error('TODO: Not implemented');
    }

    public async untrackPseudoRegistry(registry: V2Registry): Promise<void> {
        const registries: string[] = this.storageMemento
            .get(this.trackedRegistriesStorageKey, [])
            .filter(reg => reg !== registry.label);

        await this.storageMemento.update(this.trackedRegistriesStorageKey, registries);
        this.onDidChangeTreeDataEmitter.fire(registry.parent);
    }

    private get trackedRegistriesStorageKey(): string {
        return `${this.storageKey}.TrackedRegistries`;
    }
}
