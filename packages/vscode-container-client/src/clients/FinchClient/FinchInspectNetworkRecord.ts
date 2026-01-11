/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from 'zod/v4';
import { InspectNetworksItem } from '../../contracts/ContainerClient';

// Finch (nerdctl) network inspect output - Docker-compatible format
const FinchNetworkIpamConfigSchema = z.object({
    Subnet: z.string().optional(),
    Gateway: z.string().optional(),
});

const FinchNetworkIpamSchema = z.object({
    Driver: z.string().optional(),
    Config: z.array(FinchNetworkIpamConfigSchema).optional(),
});

export const FinchInspectNetworkRecordSchema = z.object({
    Name: z.string(),
    Id: z.string().optional(),
    Driver: z.string().optional(),
    Created: z.string().optional(),
    Scope: z.string().optional(),
    Internal: z.boolean().optional(),
    EnableIPv6: z.boolean().optional(),
    Attachable: z.boolean().optional(),
    Ingress: z.boolean().optional(),
    Labels: z.record(z.string(), z.string()).nullable().optional(),
    IPAM: FinchNetworkIpamSchema.optional(),
});

type FinchInspectNetworkRecord = z.infer<typeof FinchInspectNetworkRecordSchema>;

export function normalizeFinchInspectNetworkRecord(network: FinchInspectNetworkRecord, raw: string): InspectNetworksItem {
    // Build ipam config array, keeping entries where at least one of Subnet or Gateway is defined
    const ipamConfig = (network.IPAM?.Config ?? [])
        .filter((config) => config.Subnet !== undefined || config.Gateway !== undefined)
        .map((config) => ({
            subnet: config.Subnet ?? '',
            gateway: config.Gateway ?? '',
        }));

    // Validate createdAt date to avoid Invalid Date
    let createdAt: Date | undefined;
    if (network.Created) {
        const parsedDate = new Date(network.Created);
        if (!isNaN(parsedDate.getTime())) {
            createdAt = parsedDate;
        }
    }

    return {
        name: network.Name,
        id: network.Id,
        driver: network.Driver,
        createdAt,
        scope: network.Scope,
        internal: network.Internal,
        ipv6: network.EnableIPv6,
        attachable: network.Attachable,
        ingress: network.Ingress,
        labels: network.Labels ?? {},
        ipam: network.IPAM ? {
            driver: network.IPAM.Driver || 'default',
            config: ipamConfig,
        } : undefined,
        raw,
    };
}
