/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BasicCredentials } from './BasicCredentials';

export interface LoginInformation extends BasicCredentials {
    readonly server: string;
}
