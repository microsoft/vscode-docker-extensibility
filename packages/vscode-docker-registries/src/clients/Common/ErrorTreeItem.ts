/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommonError, CommonRegistryItem } from "./models";

export interface RegistryConnectError extends CommonError {
    readonly parent: CommonRegistryItem | undefined;
    readonly type: 'commonerror';
    readonly additionalContextValues: ['registryConnectError'];
}

export function getErrorTreeItem(error: unknown, parent: CommonRegistryItem | undefined): CommonError[] {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const errorType = error instanceof Error ? error.name : 'Unknown error';

    // if the error is an Unauthorized error, return a special error type
    if (errorMsg.includes('Unauthorized') || errorType === 'UnauthorizedError') {
        return [{
            parent,
            label: errorMsg,
            type: 'commonerror',
            description: 'Connect to Registry',
            additionalContextValues: ['registryConnectError'],
        }];
    }

    // otherwise, return a generic error
    return [{
        parent: parent,
        label: errorMsg,
        type: 'commonerror',
    }];
}
