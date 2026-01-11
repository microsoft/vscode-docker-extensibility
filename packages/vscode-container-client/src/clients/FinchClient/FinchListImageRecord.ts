/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from 'zod/v4';
import { ListImagesItem } from '../../contracts/ContainerClient';
import { dayjs } from '../../utils/dayjs';
import { parseDockerLikeImageName } from '../../utils/parseDockerLikeImageName';

// Finch (nerdctl) uses a format similar to Docker but with some differences
// nerdctl image ls --format '{{json .}}' outputs per-line JSON
export const FinchListImageRecordSchema = z.object({
    ID: z.string().optional(),
    Repository: z.string(),
    Tag: z.string().optional(),
    CreatedAt: z.string().optional(),
    CreatedSince: z.string().optional(),
    Size: z.union([z.string(), z.number()]).optional(),
    Digest: z.string().optional(),
    Platform: z.string().optional(),
});

export type FinchListImageRecord = z.infer<typeof FinchListImageRecordSchema>;

export function normalizeFinchListImageRecord(image: FinchListImageRecord): ListImagesItem {
    // Parse creation date with validation - provide fallback for when it's not available or invalid
    let createdAt: Date;
    if (image.CreatedAt) {
        const parsedDate = dayjs.utc(image.CreatedAt);
        createdAt = parsedDate.isValid() ? parsedDate.toDate() : new Date(0);
    } else {
        createdAt = new Date(0); // Epoch as fallback
    }

    // Parse size - nerdctl may return it as string like "1.2GB" or as number
    let size: number | undefined;
    if (typeof image.Size === 'number' && Number.isFinite(image.Size)) {
        size = image.Size;
    } else if (typeof image.Size === 'string') {
        // Try to parse human-readable size strings
        const sizeRegex = /^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i;
        const sizeMatch = sizeRegex.exec(image.Size);
        if (sizeMatch) {
            const num = parseFloat(sizeMatch[1]);
            // Validate parsed number before computing size
            if (Number.isFinite(num)) {
                const unit = (sizeMatch[2] ?? 'B').toUpperCase();
                const multipliers: Record<string, number> = {
                    'B': 1,
                    'KB': 1024,
                    'MB': 1024 * 1024,
                    'GB': 1024 * 1024 * 1024,
                    'TB': 1024 * 1024 * 1024 * 1024,
                };
                size = num * (multipliers[unit] ?? 1);
            }
        }
    }

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
