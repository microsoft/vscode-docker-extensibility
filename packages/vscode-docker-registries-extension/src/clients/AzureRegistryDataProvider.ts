/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureSubscription, VSCodeAzureSubscriptionProvider } from '@microsoft/vscode-azext-azureauth';
import { RegistryV2DataProvider, V2Registry, V2RegistryItem, V2RegistryRoot } from '@microsoft/vscode-docker-registries';
import { CommonRegistryItem, isRegistryRoot } from '@microsoft/vscode-docker-registries/lib/clients/Common/models';
import * as vscode from 'vscode';
import { ACROAuthProvider } from './ACROAuthProvider';

interface AzureSubscriptionRegistryItem extends V2RegistryItem {
    readonly parent: V2RegistryRoot;
    readonly subscription: AzureSubscription;
    readonly type: 'azuresubscription';
}

function isAzureSubscriptionRegistryItem(item: unknown): item is AzureSubscriptionRegistryItem {
    return !!item && typeof item === 'object' && 'subscription' in item;
}

export class AzureRegistryDataProvider extends RegistryV2DataProvider implements vscode.Disposable {
    public readonly id = 'vscode-docker.azureContainerRegistry';
    public readonly label = vscode.l10n.t('Azure');
    public readonly icon = new vscode.ThemeIcon('azure');
    public readonly description = vscode.l10n.t('Azure Container Registry');

    private readonly subscriptionProvider = new VSCodeAzureSubscriptionProvider();

    public constructor(private readonly extensionContext: vscode.ExtensionContext) {
        super(new ACROAuthProvider());
    }

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
                    label: sub.name,
                    type: 'azuresubscription',
                    subscription: sub,
                    additionalContextValues: ['azuresubscription']
                } as AzureSubscriptionRegistryItem;
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

    public async getRegistries(subscriptionItem: AzureSubscriptionRegistryItem): Promise<V2Registry[]> {
        return [
            {
                parent: subscriptionItem,
                type: 'commonregistry',
                registryUri: vscode.Uri.parse('https://bwateracr.azurecr.io'),
                label: 'bwateracr.azurecr.io',
                icon: vscode.Uri.joinPath(this.extensionContext.extensionUri, 'resources', 'azureRegistry.svg'),
            }
        ];
    }

    public override getTreeItem(element: CommonRegistryItem): Promise<vscode.TreeItem> {
        if (isAzureSubscriptionRegistryItem(element)) {
            return Promise.resolve({
                label: element.label,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                contextValue: 'azuresubscription',
                iconPath: vscode.Uri.joinPath(this.extensionContext.extensionUri, 'resources', 'azureSubscription.svg'),
            });
        } else {
            return super.getTreeItem(element);
        }
    }
}
