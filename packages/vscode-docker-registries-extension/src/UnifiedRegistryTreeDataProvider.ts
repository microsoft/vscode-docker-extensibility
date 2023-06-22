import { RegistryDataProvider } from '@microsoft/vscode-docker-registries';
import * as vscode from 'vscode';

interface UnifiedRegistryItem<T> {
    provider: RegistryDataProvider<T>;
    wrappedItem: T;
    parent: UnifiedRegistryItem<T> | undefined;
}

export class UnifiedRegistryTreeDataProvider implements vscode.TreeDataProvider<UnifiedRegistryItem<unknown>> {
    private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<UnifiedRegistryItem<unknown> | UnifiedRegistryItem<unknown>[] | undefined>();
    public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    private readonly providers: RegistryDataProvider<unknown>[] = [];

    public getTreeItem(element: UnifiedRegistryItem<unknown>): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element.provider.getTreeItem(element.wrappedItem);
    }

    public async getChildren(element?: UnifiedRegistryItem<unknown> | undefined): Promise<UnifiedRegistryItem<unknown>[]> {
        if (element) {
            const elements = await element.provider.getChildren(element.wrappedItem);

            if (!elements) {
                return [];
            }

            return elements.map(e => {
                return {
                    provider: element.provider,
                    wrappedItem: e,
                    parent: element
                };
            });
        } else {
            const unifiedRoots: UnifiedRegistryItem<unknown>[] = [];

            for (const provider of this.providers) {
                const roots = await provider.getChildren(undefined);
                if (!roots) {
                    continue;
                }

                unifiedRoots.push(...roots.map(r => {
                    return {
                        provider,
                        wrappedItem: r,
                        parent: undefined
                    };
                }));
            }

            return unifiedRoots;
        }
    }

    public getParent(element: UnifiedRegistryItem<unknown>): UnifiedRegistryItem<unknown> | undefined {
        return element.parent;
    }

    public registerProvider(provider: RegistryDataProvider<unknown>): void {
        this.providers.push(provider);
    }

    public refresh(): void {
        this.onDidChangeTreeDataEmitter.fire(undefined);
    }
}
