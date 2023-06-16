/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { RegistryItem } from './RegistryItem';
import { LoginInformation } from './BasicCredentials';

export interface RegistryDataProvider<T extends RegistryItem> extends vscode.TreeDataProvider<T> {
    readonly label: string;
    readonly description?: string;
    readonly icon?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } | vscode.ThemeIcon;

    getLoginInformation?(item: T): Promise<LoginInformation> | LoginInformation;
}
