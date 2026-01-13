/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from 'zod/v4';
import { InspectNetworksItem } from '../../contracts/ContainerClient';
import { dateStringSchema } from '../../contracts/ZodTransforms';

// Nerdctl (nerdctl) network inspect output - Docker-compatible format
const NerdctlNetworkIpamConfigSchema = z.object({
    Subnet: z.string().optional(),
    Gateway: z.string().optional(),
});

const NerdctlNetworkIpamSchema = z.object({
    Driver: z.string().optional(),
    Config: z.array(NerdctlNetworkIpamConfigSchema).optional(),
});

/**
 * Nerdctl network inspect schema with date transformation.
 */
export const NerdctlInspectNetworkRecordSchema = z.object({
    Name: z.string(),
    Id: z.string().optional(),
    Driver: z.string().optional(),
    // Date string transformed to Date object (undefined if invalid)
    Created: dateStringSchema.optional(),
    Scope: z.string().optional(),
    Internal: z.boolean().optional(),
    EnableIPv6: z.boolean().optional(),
    Attachable: z.boolean().optional(),
    Ingress: z.boolean().optional(),
    Labels: z.record(z.string(), z.string()).nullable().optional(),
    IPAM: NerdctlNetworkIpamSchema.optional(),
});

export type NerdctlInspectNetworkRecord = z.infer<typeof NerdctlInspectNetworkRecordSchema>;

/**
 * Normalize a parsed NerdctlInspectNetworkRecord to the common InspectNetworksItem format.
 * Date transformation is already done by the schema.
 */
export function normalizeNerdctlInspectNetworkRecord(network: NerdctlInspectNetworkRecord, raw: string): InspectNetworksItem {
    // Build ipam config array, keeping entries where at least one of Subnet or Gateway is defined
    const ipamConfig = (network.IPAM?.Config ?? [])
        .filter((config) => config.Subnet !== undefined || config.Gateway !== undefined)
        .map((config) => ({
            subnet: config.Subnet ?? '',
            gateway: config.Gateway ?? '',
        }));

    return {
        name: network.Name,
        id: network.Id,
        driver: network.Driver,
        createdAt: network.Created,
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
