/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from 'zod/v4';
import { InspectVolumesItem } from '../../contracts/ContainerClient';
import { parseDockerLikeLabels } from '../DockerClientBase/parseDockerLikeLabels';

// Nerdctl (nerdctl) volume inspect output - Docker-compatible format
// Note: Labels can be an empty string "" when no labels are set (in volume ls), or a record
export const NerdctlInspectVolumeRecordSchema = z.object({
    Name: z.string(),
    Driver: z.string().optional(),
    Mountpoint: z.string().optional(),
    CreatedAt: z.string().optional(),
    Labels: z.union([z.record(z.string(), z.string()), z.string()]).optional().nullable(),
    Scope: z.string().optional(),
    Options: z.record(z.string(), z.unknown()).optional().nullable(),
    Size: z.string().optional(),
});

type NerdctlInspectVolumeRecord = z.infer<typeof NerdctlInspectVolumeRecordSchema>;

export function normalizeNerdctlInspectVolumeRecord(volume: NerdctlInspectVolumeRecord, raw: string): InspectVolumesItem {
    // Labels can be:
    // - A record/object (normal case)
    // - An empty string "" when no labels are set
    // - A string like "key=value,key2=value2" (parse with parseDockerLikeLabels)
    let labels: Record<string, string>;
    if (typeof volume.Labels === 'string') {
        // Parse string labels - handles both empty strings and "key=value" format
        labels = parseDockerLikeLabels(volume.Labels);
    } else {
        labels = volume.Labels ?? {};
    }

    // Parse and validate CreatedAt - use current time as fallback (less misleading than epoch)
    let createdAt: Date;
    if (volume.CreatedAt) {
        const parsed = new Date(volume.CreatedAt);
        createdAt = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    } else {
        createdAt = new Date();
    }

    return {
        name: volume.Name,
        driver: volume.Driver || 'local',
        mountpoint: volume.Mountpoint || '',
        createdAt,
        labels,
        scope: volume.Scope || 'local',
        options: volume.Options ?? {},
        raw,
    };
}
