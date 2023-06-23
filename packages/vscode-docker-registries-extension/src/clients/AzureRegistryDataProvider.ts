/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VSCodeAzureSubscriptionProvider } from '@microsoft/vscode-azext-azureauth';
import { RegistryV2DataProvider, V2Registry, V2RegistryItem, V2RegistryRoot } from '@microsoft/vscode-docker-registries';
import { CommonRegistryItem, isRegistryRoot } from '@microsoft/vscode-docker-registries/lib/clients/common/models';
import * as vscode from 'vscode';

interface AzureSubscriptionRegistryItem extends V2RegistryItem {
    readonly parent: V2RegistryRoot;
    readonly subscriptionId: string;
    readonly type: 'azuresubscription';
}

function isAzureSubscriptionRegistryItem(item: unknown): item is AzureSubscriptionRegistryItem {
    return !!item && typeof item === 'object' && 'subscriptionId' in item;
}

export class AzureRegistryDataProvider extends RegistryV2DataProvider implements vscode.Disposable {
    public readonly id = 'vscode-docker.azureContainerRegistry';
    public readonly label = vscode.l10n.t('Azure');
    public readonly icon = new vscode.ThemeIcon('azure');
    public readonly description = vscode.l10n.t('Azure Container Registry');

    private readonly subscriptionProvider = new VSCodeAzureSubscriptionProvider();

    public override async getChildren(element?: CommonRegistryItem | undefined): Promise<CommonRegistryItem[]> {
        if (isRegistryRoot(element)) {
            if (!await this.subscriptionProvider.isSignedIn()) {
                // TODO: show a node for sign in
                await this.subscriptionProvider.signIn();
                this.onDidChangeTreeDataEmitter.fire(element);
                return [];
            }

            const subscriptions = await this.subscriptionProvider.getSubscriptions();

            return subscriptions.map(sub => {
                return {
                    parent: element,
                    registryRootUri: element.registryRootUri,
                    label: sub.name,
                    type: 'azuresubscription',
                    subscriptionId: sub.subscriptionId,
                    additionalContextValues: ['azuresubscription']
                };
            });
        } else if (isAzureSubscriptionRegistryItem(element)) {
            return await this.getRegistries(element);
        } else {
            return await super.getChildren(element);
        }
    }

    public dispose(): void {
        this.subscriptionProvider.dispose();
    }

    getRegistries(subscriptionItem: AzureSubscriptionRegistryItem): V2Registry[] | Promise<V2Registry[]> {
        return [
            {
                parent: subscriptionItem,
                type: 'commonregistry',
                registryUri: vscode.Uri.parse('https://bwateracr.azurecr.io'),
                label: 'bwateracr.azurecr.io',
                // icon: TODO
            }
        ];
    }
}
