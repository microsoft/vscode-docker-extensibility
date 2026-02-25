/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from 'zod/v4';
import { InspectVolumesItem } from '../../contracts/ContainerClient';
import { dateStringWithFallbackSchema, labelsSchema } from '../../contracts/ZodTransforms';

/**
 * Nerdctl (nerdctl) volume inspect output - Docker-compatible format.
 * Transforms are applied during parsing for labels and dates.
 */
export const NerdctlInspectVolumeRecordSchema = z.object({
    Name: z.string(),
    Driver: z.string().optional(),
    Mountpoint: z.string().optional(),
    // Date string transformed to Date object with fallback to current time
    CreatedAt: dateStringWithFallbackSchema.optional(),
    // Labels can be a record, empty string, or "key=value,key2=value2" string
    Labels: labelsSchema.optional().nullable(),
    Scope: z.string().optional(),
    Options: z.record(z.string(), z.unknown()).optional().nullable(),
    Size: z.string().optional(),
});

export type NerdctlInspectVolumeRecord = z.infer<typeof NerdctlInspectVolumeRecordSchema>;

/**
 * Normalize a parsed NerdctlInspectVolumeRecord to the common InspectVolumesItem format.
 * Most transformations are already done by the schema.
 */
export function normalizeNerdctlInspectVolumeRecord(volume: NerdctlInspectVolumeRecord, raw: string): InspectVolumesItem {
    return {
        name: volume.Name,
        driver: volume.Driver || 'local',
        mountpoint: volume.Mountpoint || '',
        createdAt: volume.CreatedAt ?? new Date(),
        labels: volume.Labels ?? {},
        scope: volume.Scope || 'local',
        options: volume.Options ?? {},
        raw,
    };
}
