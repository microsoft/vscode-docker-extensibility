/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { RegistryDataProvider } from '../../contracts/RegistryDataProvider';
import { DefaultRegistryItem, DefaultRegistryRoot, isRegistry, isRegistryRoot, isRepository, isTag } from './Models';
import { getContextValue } from '../../utils/contextValues';

export abstract class DefaultRegistryDataProvider<T extends DefaultRegistryItem> implements RegistryDataProvider<T> {
    protected readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<T | undefined>();
    public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    public getChildren(element?: T | undefined): Promise<T[]> {
        if (!element) {
            return Promise.resolve([
                {
                    type: 'defaultregistryroot',
                    label: this.label,
                    description: this.description,
                    rootIcon: this.icon,
                } as DefaultRegistryRoot as unknown as T,
            ]);
        } else if (isRegistryRoot(element)) {
            return Promise.resolve(this.getRegistries());
        } else if (isRegistry(element)) {
            return Promise.resolve(this.getRepositories(element));
        } else if (isRepository(element)) {
            return Promise.resolve(this.getTags(element));
        } else {
            throw new Error(`Unexpected element: ${element.toString()}`);
        }
    }

    public getTreeItem(element: T): Promise<vscode.TreeItem> {
        if (isRegistryRoot(element)) {
            return Promise.resolve({
                ...element,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                contextValue: getContextValue(element, 'defaultregistryroot'), // TODO
                iconPath: element.rootIcon,
            });
        } else if (isRegistry(element)) {
            return Promise.resolve({
                ...element,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                contextValue: getContextValue(element, 'defaultregistry'), // TODO
                iconPath: element.registryIcon || new vscode.ThemeIcon('briefcase'),
            });
        } else if (isRepository(element)) {
            return Promise.resolve({
                ...element,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                contextValue: getContextValue(element, 'defaultrepository'), // TODO
                iconPath: new vscode.ThemeIcon('repo'),
            });
        } else if (isTag(element)) {
            return Promise.resolve({
                ...element,
                collapsibleState: vscode.TreeItemCollapsibleState.None,
                contextValue: getContextValue(element, 'defaulttag'), // TODO
                iconPath: new vscode.ThemeIcon('tag'),
            });
        } else {
            throw new Error(`Unexpected element: ${element.toString()}`);
        }
    }

    public abstract readonly label: string;
    public abstract readonly description?: string;
    public abstract readonly icon?: vscode.ThemeIcon;

    public abstract getRegistries(): Promise<T[]> | T[];
    public abstract getRepositories(registry: T): Promise<T[]> | T[];
    public abstract getTags(repository: T): Promise<T[]> | T[];

    public deleteRegistry?(item: T): Promise<void>;
    public deleteRepository?(item: T): Promise<void>;
    public deleteTag?(item: T): Promise<void>;
}
