/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from 'zod/v4';
import { ListNetworkItem } from '../../contracts/ContainerClient';
import { booleanStringSchema, dateStringSchema, labelsStringSchema } from '../../contracts/ZodTransforms';

/**
 * Nerdctl (nerdctl) network list output - Docker-compatible format.
 * Transforms are applied during parsing to convert string values to proper types.
 */
export const NerdctlListNetworkRecordSchema = z.object({
    ID: z.string().optional(),
    Name: z.string(),
    Driver: z.string().optional(),
    Scope: z.string().optional(),
    // nerdctl outputs booleans as "true"/"false" strings - transform during parsing
    IPv6: booleanStringSchema.optional(),
    Internal: booleanStringSchema.optional(),
    // Labels come as "key=value,key2=value2" string - transform to Record
    Labels: labelsStringSchema.optional(),
    // Date string transformed to Date object
    CreatedAt: dateStringSchema.optional(),
});

export type NerdctlListNetworkRecord = z.infer<typeof NerdctlListNetworkRecordSchema>;

/**
 * Normalize a parsed NerdctlListNetworkRecord to the common ListNetworkItem format.
 * Most transformations are already done by the schema.
 */
export function normalizeNerdctlListNetworkRecord(network: NerdctlListNetworkRecord): ListNetworkItem {
    return {
        id: network.ID,
        name: network.Name,
        driver: network.Driver,
        scope: network.Scope,
        internal: network.Internal ?? false,
        ipv6: network.IPv6 ?? false,
        labels: network.Labels ?? {},
        createdAt: network.CreatedAt,
    };
}
