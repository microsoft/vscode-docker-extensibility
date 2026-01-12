/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from 'zod/v4';
import { ListNetworkItem } from '../../contracts/ContainerClient';
import { parseDockerLikeLabels } from '../DockerClientBase/parseDockerLikeLabels';

// Nerdctl (nerdctl) network list output - Docker-compatible format
export const NerdctlListNetworkRecordSchema = z.object({
    ID: z.string().optional(),
    Name: z.string(),
    Driver: z.string().optional(),
    Scope: z.string().optional(),
    IPv6: z.string().optional(),
    Internal: z.string().optional(),
    Labels: z.string().optional(),
    CreatedAt: z.string().optional(),
});

type NerdctlListNetworkRecord = z.infer<typeof NerdctlListNetworkRecordSchema>;

export function normalizeNerdctlListNetworkRecord(network: NerdctlListNetworkRecord): ListNetworkItem {
    // nerdctl outputs booleans as "true"/"false" strings in list format
    const internal = network.Internal?.toLowerCase() === 'true';
    const ipv6 = network.IPv6?.toLowerCase() === 'true';

    // Parse labels from string format "key=value,key2=value2"
    const labels = parseDockerLikeLabels(network.Labels || '');

    return {
        id: network.ID,
        name: network.Name,
        driver: network.Driver,
        scope: network.Scope,
        internal,
        ipv6,
        labels,
        createdAt: network.CreatedAt ? new Date(network.CreatedAt) : undefined,
    };
}
