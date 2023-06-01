/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { RegistryItem } from './RegistryItem';
import { BasicCredentials } from './BasicCredentials';

export interface RegistryDataProvider<T extends RegistryItem> extends vscode.TreeDataProvider<T> {
    readonly label: string;
    readonly description?: string;

    getBasicCredentials?(item: T): Promise<BasicCredentials> | BasicCredentials;
}
