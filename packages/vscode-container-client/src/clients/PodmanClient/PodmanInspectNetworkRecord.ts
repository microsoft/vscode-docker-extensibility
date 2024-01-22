/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { InspectNetworksItem } from "../../contracts/ContainerClient";

export type PodmanInspectNetworkRecord = {
    name: string;
    labels?: Record<string, string>;
};

export function isPodmanInspectNetworkRecord(maybeNetwork: unknown): maybeNetwork is PodmanInspectNetworkRecord {
    const network = maybeNetwork as PodmanInspectNetworkRecord;

    if (!network || typeof network !== 'object') {
        return false;
    }

    if (typeof network.name !== 'string') {
        return false;
    }

    if (network.labels && typeof network.labels !== 'object') {
        return false;
    }

    return true;
}

export function normalizePodmanInspectNetworkRecord(network: PodmanInspectNetworkRecord): InspectNetworksItem {
    return {
        name: network.name,
        raw: JSON.stringify(network),
    };
}
