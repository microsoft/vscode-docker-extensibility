/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { RegistryDataProvider } from '../../contracts/RegistryDataProvider';
import { CommonRegistry, CommonRegistryItem, CommonRegistryRoot, CommonRepository, CommonTag, RegistryErrorItem, isRegistry, isRegistryRoot, isRepository, isTag } from './models';
import { getContextValue } from '../../utils/contextValues';
import { LoginInformation } from '../../contracts/BasicCredentials';
import * as dayjs from 'dayjs';
import * as relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export abstract class CommonRegistryDataProvider implements RegistryDataProvider<CommonRegistryItem> {
    protected readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<CommonRegistryItem | undefined>();
    public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    public async getChildren(element?: CommonRegistryItem | undefined): Promise<CommonRegistryItem[]> {
        try {
            if (!element) {
                return [await this.getRoot()];
            } else if (isRegistryRoot(element)) {
                return await this.getRegistries(element);
            } else if (isRegistry(element)) {
                return await this.getRepositories(element);
            } else if (isRepository(element)) {
                return await this.getTags(element);
            } else {
                throw new Error(`Unexpected element: ${JSON.stringify(element)}`);
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                return [this.getRegistryErrorItem(error.message, element)];
            } else {
                return [this.getRegistryErrorItem('Unknown error', element)];
            }
        }
    }

    public getTreeItem(element: CommonRegistryItem): Promise<vscode.TreeItem> {
        if (isRegistryRoot(element)) {
            return Promise.resolve({
                ...element,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                contextValue: getContextValue(element, 'commonregistryroot'), // TODO
                iconPath: element.iconPath,
            });
        } else if (isRegistry(element)) {
            return Promise.resolve({
                ...element,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                contextValue: getContextValue(element, 'commonregistry'), // TODO
                iconPath: element.iconPath || new vscode.ThemeIcon('briefcase'),
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
                iconPath: new vscode.ThemeIcon('bookmark'),
                description: dayjs(element.createdAt).fromNow(),
            });
        } else {
            throw new Error(`Unexpected element: ${JSON.stringify(element)}`);
        }
    }

    public getRegistryErrorItem(errorMsg: string, parent: CommonRegistryItem | undefined): RegistryErrorItem {
        const errorItem: RegistryErrorItem = {
            parent: parent,
            label: errorMsg,
            type: 'commonerror',
        };

        return errorItem;
    }

    public abstract readonly id: string;
    public abstract readonly label: string;
    public abstract readonly description?: string;
    public abstract readonly iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } | vscode.ThemeIcon;

    public abstract getRoot(): Promise<CommonRegistryRoot> | CommonRegistryRoot;
    public abstract getRegistries(root: CommonRegistryRoot | CommonRegistryItem): Promise<CommonRegistry[]> | CommonRegistry[];
    public abstract getRepositories(registry: CommonRegistry): Promise<CommonRepository[]> | CommonRepository[];
    public abstract getTags(repository: CommonRepository): Promise<CommonTag[]> | CommonTag[];

    public getLoginInformation?(item: CommonRegistryItem): Promise<LoginInformation> | LoginInformation;

    public deleteRegistry?(item: CommonRegistry): Promise<void>;
    public deleteRepository?(item: CommonRepository): Promise<void>;
    public deleteTag?(item: CommonTag): Promise<void>;
    public getImageDigest?(item: CommonTag): Promise<string>;
}
