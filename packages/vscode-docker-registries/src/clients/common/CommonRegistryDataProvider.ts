/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { RegistryDataProvider } from '../../contracts/RegistryDataProvider';
import { CommonRegistry, CommonRegistryItem, CommonRegistryRoot, CommonRepository, CommonTag, isRegistry, isRegistryRoot, isRepository, isTag } from './models';
import { getContextValue } from '../../utils/contextValues';
import { LoginInformation } from '../../contracts/BasicCredentials';

export abstract class CommonRegistryDataProvider implements RegistryDataProvider<CommonRegistryItem> {
    protected readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<CommonRegistryItem | undefined>();
    public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    public async getChildren(element?: CommonRegistryItem | undefined): Promise<CommonRegistryItem[]> {
        if (!element) {
            return [await this.getRoot()];
        } else if (isRegistryRoot(element)) {
            return (await this.getRegistries(element));
        } else if (isRegistry(element)) {
            return await this.getRepositories(element);
        } else if (isRepository(element)) {
            return await this.getTags(element);
        } else {
            throw new Error(`Unexpected element: ${JSON.stringify(element)}`);
        }
    }

    public getTreeItem(element: CommonRegistryItem): Promise<vscode.TreeItem> {
        if (isRegistryRoot(element)) {
            return Promise.resolve({
                ...element,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                contextValue: getContextValue(element, 'commonregistryroot'), // TODO
                iconPath: element.icon,
            });
        } else if (isRegistry(element)) {
            return Promise.resolve({
                ...element,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                contextValue: getContextValue(element, 'commonregistry'), // TODO
                iconPath: element.icon || new vscode.ThemeIcon('briefcase'),
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

    public abstract readonly id: string;
    public abstract readonly label: string;
    public abstract readonly description?: string;
    public abstract readonly icon?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } | vscode.ThemeIcon;

    public abstract getRoot(): Promise<CommonRegistryRoot> | CommonRegistryRoot;
    public abstract getRegistries(root: CommonRegistryRoot | CommonRegistryItem): Promise<CommonRegistry[]> | CommonRegistry[];
    public abstract getRepositories(registry: CommonRegistry): Promise<CommonRepository[]> | CommonRepository[];
    public abstract getTags(repository: CommonRepository): Promise<CommonTag[]> | CommonTag[];

    public getLoginInformation?(item: CommonRegistryItem): Promise<LoginInformation> | LoginInformation;

    public deleteRegistry?(item: CommonRegistry): Promise<void>;
    public deleteRepository?(item: CommonRepository): Promise<void>;
    public deleteTag?(item: CommonTag): Promise<void>;
}
