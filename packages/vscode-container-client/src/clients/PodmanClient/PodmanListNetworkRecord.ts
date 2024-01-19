/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type PodmanListNetworkRecord = {
    Name: string;
    Labels?: Record<string, string>;
};

export function isPodmanListNetworkRecord(maybeNetwork: unknown): maybeNetwork is PodmanListNetworkRecord {
    const network = maybeNetwork as PodmanListNetworkRecord;

    if (!network || typeof network !== 'object') {
        return false;
    }

    if (typeof network.Name !== 'string') {
        return false;
    }

    return true;
}
