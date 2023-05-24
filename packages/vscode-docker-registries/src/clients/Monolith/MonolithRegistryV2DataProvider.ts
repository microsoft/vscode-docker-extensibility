/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AuthenticationProvider } from '../../contracts/AuthenticationProvider';
import { RegistryV2DataProvider, V2Registry, V2RegistryRoot } from '../RegistryV2/RegistryV2DataProvider';
import { CommonRegistryItem, CommonRegistryRoot } from '../common/models';
import { ContextValueRegistryItem } from '../../contracts/RegistryItem';

export class MonolithRegistryV2DataProvider extends RegistryV2DataProvider {
    protected constructor(
        label: string,
        authenticationProvider: AuthenticationProvider,
        private readonly storageMemento: vscode.Memento,
        private readonly storageKey: string,
        description?: string,
        icon?: vscode.ThemeIcon
    ) {
        super(label, authenticationProvider, description, icon);
    }

    public override async getChildren(element?: CommonRegistryItem | undefined): Promise<CommonRegistryItem[]> {
        if (!element) {
            // Add to the context value to note that this is a monolithic registry
            return (await super.getChildren(element))
                .map(registry => ({ ...registry as CommonRegistryRoot, additionalContextValues: ['monolith'] } as CommonRegistryRoot & ContextValueRegistryItem));
        } else {
            return super.getChildren();
        }
    }

    // TODO: can I use a decorator to accomplish this instead of a whole class?
    public getRegistries(root: V2RegistryRoot): V2Registry[] {
        const registries: string[] = this.storageMemento.get(this.storageKey, []);
        return registries.map(reg => {
            return {
                type: 'commonregistry',
                parent: root,
                registryRootUri: root.registryRootUri,
                label: reg,
                additionalContextValues: ['monolithregistry'],
            } as V2Registry & ContextValueRegistryItem;
        });
    }

    public async connectRegistry(): Promise<void> {
        // TODO
        throw new Error('Not implemented');
    }

    public async disconnectRegistry(registry: V2Registry): Promise<void> {
        const registries: string[] = this.storageMemento
            .get(this.storageKey, [])
            .filter(reg => reg !== registry.label);

        await this.storageMemento.update(this.storageKey, registries);
    }
}
