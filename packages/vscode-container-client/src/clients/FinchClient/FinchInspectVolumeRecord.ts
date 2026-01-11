/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from 'zod/v4';
import { InspectVolumesItem } from '../../contracts/ContainerClient';

// Finch (nerdctl) volume inspect output - Docker-compatible format
// Note: Labels can be an empty string "" when no labels are set (in volume ls), or a record
export const FinchInspectVolumeRecordSchema = z.object({
    Name: z.string(),
    Driver: z.string().optional(),
    Mountpoint: z.string().optional(),
    CreatedAt: z.string().optional(),
    Labels: z.union([z.record(z.string(), z.string()), z.string()]).optional().nullable(),
    Scope: z.string().optional(),
    Options: z.record(z.string(), z.unknown()).optional().nullable(),
    Size: z.string().optional(),
});

type FinchInspectVolumeRecord = z.infer<typeof FinchInspectVolumeRecordSchema>;

export function normalizeFinchInspectVolumeRecord(volume: FinchInspectVolumeRecord, raw: string): InspectVolumesItem {
    // Labels can be an empty string "" in Finch when no labels are set
    const labels = typeof volume.Labels === 'string' ? {} : (volume.Labels ?? {});

    return {
        name: volume.Name,
        driver: volume.Driver || 'local',
        mountpoint: volume.Mountpoint || '',
        createdAt: volume.CreatedAt ? new Date(volume.CreatedAt) : new Date(0), // Epoch as fallback
        labels,
        scope: volume.Scope || 'local',
        options: volume.Options ?? {},
        raw,
    };
}
