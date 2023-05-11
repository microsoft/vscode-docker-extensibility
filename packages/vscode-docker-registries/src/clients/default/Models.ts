/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { RegistryItem } from '../../contracts/RegistryItem';

export interface DefaultRegistryItem extends RegistryItem {
    readonly label: string;
    readonly description?: string;
}

export interface DefaultRegistryRoot extends DefaultRegistryItem {
    readonly type: 'defaultregistryroot';
    readonly rootIcon: vscode.ThemeIcon;
}

export function isRegistryRoot(maybeRegistryRoot: unknown): maybeRegistryRoot is DefaultRegistryRoot {
    return !!maybeRegistryRoot && typeof maybeRegistryRoot === 'object' && (maybeRegistryRoot as DefaultRegistryRoot).type === 'defaultregistryroot';
}

export interface DefaultRegistry extends DefaultRegistryItem {
    readonly type: 'defaultregistry';
    readonly registryIcon?: vscode.ThemeIcon;
}

export function isRegistry(maybeRegistry: unknown): maybeRegistry is DefaultRegistry {
    return !!maybeRegistry && typeof maybeRegistry === 'object' && (maybeRegistry as DefaultRegistry).type === 'defaultregistry';
}

export interface DefaultRepository extends DefaultRegistryItem {
    readonly type: 'defaultrepository';
}

export function isRepository(maybeRepository: unknown): maybeRepository is DefaultRepository {
    return !!maybeRepository && typeof maybeRepository === 'object' && (maybeRepository as DefaultRepository).type === 'defaultrepository';
}

export interface DefaultTag extends DefaultRegistryItem {
    readonly type: 'defaulttag';
}

export function isTag(maybeTag: unknown): maybeTag is DefaultTag {
    return !!maybeTag && typeof maybeTag === 'object' && (maybeTag as DefaultTag).type === 'defaulttag';
}
