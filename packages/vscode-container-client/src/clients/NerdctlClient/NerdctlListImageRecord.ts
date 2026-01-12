/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from 'zod/v4';
import { ListImagesItem } from '../../contracts/ContainerClient';
import { dayjs } from '../../utils/dayjs';
import { parseDockerLikeImageName } from '../../utils/parseDockerLikeImageName';
import { tryParseSize } from '../DockerClientBase/tryParseSize';

// Nerdctl (nerdctl) uses a format similar to Docker but with some differences
// nerdctl image ls --format '{{json .}}' outputs per-line JSON
export const NerdctlListImageRecordSchema = z.object({
    ID: z.string().optional(),
    Repository: z.string(),
    Tag: z.string().optional(),
    CreatedAt: z.string().optional(),
    CreatedSince: z.string().optional(),
    Size: z.union([z.string(), z.number()]).optional(),
    Digest: z.string().optional(),
    Platform: z.string().optional(),
});

export type NerdctlListImageRecord = z.infer<typeof NerdctlListImageRecordSchema>;

export function normalizeNerdctlListImageRecord(image: NerdctlListImageRecord): ListImagesItem {
    // Parse creation date with validation - use current time as fallback (less misleading than epoch)
    let createdAt: Date;
    if (image.CreatedAt) {
        const parsedDate = dayjs.utc(image.CreatedAt);
        createdAt = parsedDate.isValid() ? parsedDate.toDate() : new Date();
    } else {
        createdAt = new Date(); // Use current time as fallback
    }

    // Use the shared tryParseSize utility for consistent size parsing
    const size = tryParseSize(image.Size);

    // Handle optional/empty Tag - only append if it's a non-empty string
    const tag = image.Tag?.trim();
    const repositoryAndTag = `${image.Repository}${tag && tag !== '<none>' ? `:${tag}` : ''}`;

    return {
        id: image.ID || '',
        image: parseDockerLikeImageName(repositoryAndTag),
        createdAt,
        size,
    };
}
