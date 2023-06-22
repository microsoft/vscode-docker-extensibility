/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ContextValueRegistryItem, RegistryItem } from '../../contracts/RegistryItem';

export interface CommonRegistryItem extends RegistryItem, ContextValueRegistryItem {
    readonly label: string;
    readonly description?: string;
}

export interface CommonRegistryRoot extends CommonRegistryItem {
    readonly type: 'commonroot';
    readonly rootIcon: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } | vscode.ThemeIcon;
}

export function isRegistryRoot(maybeRegistryRoot: unknown): maybeRegistryRoot is CommonRegistryRoot {
    return !!maybeRegistryRoot && typeof maybeRegistryRoot === 'object' && (maybeRegistryRoot as CommonRegistryRoot).type === 'commonroot';
}

export interface CommonRegistry extends CommonRegistryItem {
    readonly type: 'commonregistry';
    readonly registryIcon?: vscode.ThemeIcon;
}

export function isRegistry(maybeRegistry: unknown): maybeRegistry is CommonRegistry {
    return !!maybeRegistry && typeof maybeRegistry === 'object' && (maybeRegistry as CommonRegistry).type === 'commonregistry';
}

export interface CommonRepository extends CommonRegistryItem {
    readonly type: 'commonrepository';
}

export function isRepository(maybeRepository: unknown): maybeRepository is CommonRepository {
    return !!maybeRepository && typeof maybeRepository === 'object' && (maybeRepository as CommonRepository).type === 'commonrepository';
}

export interface CommonTag extends CommonRegistryItem {
    readonly type: 'commontag';
}

export function isTag(maybeTag: unknown): maybeTag is CommonTag {
    return !!maybeTag && typeof maybeTag === 'object' && (maybeTag as CommonTag).type === 'commontag';
}
