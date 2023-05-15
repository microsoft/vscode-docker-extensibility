/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { RegistryDataProvider } from '../../contracts/RegistryDataProvider';
import { CommonRegistry, CommonRegistryItem, CommonRegistryRoot, CommonRepository, CommonTag, isRegistry, isRegistryRoot, isRepository, isTag } from './models';
import { getContextValue } from '../../utils/contextValues';

export abstract class CommonRegistryDataProvider<T extends CommonRegistryItem> implements RegistryDataProvider<T> {
    protected readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<T | undefined>();
    public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    public getChildren(element?: T | undefined): Promise<T[]> {
        if (!element) {
            return Promise.resolve([
                {
                    type: 'commonregistryroot',
                    label: this.label,
                    description: this.description,
                    rootIcon: this.icon,
                } as CommonRegistryRoot,
            ]);
        } else if (isRegistryRoot(element)) {
            return Promise.resolve(this.getRegistries());
        } else if (isRegistry(element)) {
            return Promise.resolve(this.getRepositories(element));
        } else if (isRepository(element)) {
            return Promise.resolve(this.getTags(element));
        } else {
            throw new Error(`Unexpected element: ${JSON.stringify(element)}`);
        }
    }

    public getTreeItem(element: T): Promise<vscode.TreeItem> {
        if (isRegistryRoot(element)) {
            return Promise.resolve({
                ...element,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                contextValue: getContextValue(element, 'commonregistryroot'), // TODO
                iconPath: element.rootIcon,
            });
        } else if (isRegistry(element)) {
            return Promise.resolve({
                ...element,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                contextValue: getContextValue(element, 'commonregistry'), // TODO
                iconPath: element.registryIcon || new vscode.ThemeIcon('briefcase'),
            });
        } else if (isRepository(element)) {
            return Promise.resolve({
                ...element,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                contextValue: getContextValue(element, 'commonrepository'), // TODO
                iconPath: new vscode.ThemeIcon('repo'),
            });
        } else if (isTag(element)) {
            return Promise.resolve({
                ...element,
                collapsibleState: vscode.TreeItemCollapsibleState.None,
                contextValue: getContextValue(element, 'commontag'), // TODO
                iconPath: new vscode.ThemeIcon('tag'),
            });
        } else {
            throw new Error(`Unexpected element: ${JSON.stringify(element)}`);
        }
    }

    public abstract readonly label: string;
    public abstract readonly description?: string;
    public abstract readonly icon?: vscode.ThemeIcon;

    public abstract getRegistries<TRegistry extends CommonRegistry>(): Promise<TRegistry[]> | TRegistry[];
    public abstract getRepositories<TRegistry extends CommonRegistry, TRepository extends CommonRepository>(registry: TRegistry): Promise<TRepository[]> | TRepository[];
    public abstract getTags<TRepository extends CommonRepository, TTag extends CommonTag>(repository: TRepository): Promise<TTag[]> | TTag[];

    public deleteRegistry?<TRegistry extends CommonRegistry>(item: TRegistry): Promise<void>;
    public deleteRepository?<TRepository extends CommonRepository>(item: TRepository): Promise<void>;
    public deleteTag?<TTag extends CommonTag>(item: TTag): Promise<void>;
}
