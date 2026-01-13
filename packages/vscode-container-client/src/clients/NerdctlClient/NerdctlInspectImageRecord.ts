/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { toArray } from '@microsoft/vscode-processutils';
import { z } from 'zod/v4';
import { ImageNameInfo, InspectImagesItem, PortBinding } from '../../contracts/ContainerClient';
import { architectureStringSchema, dateStringSchema, osTypeStringSchema } from '../../contracts/ZodTransforms';
import { parseDockerLikeImageName } from '../../utils/parseDockerLikeImageName';
import { parseDockerLikeEnvironmentVariables } from '../DockerClientBase/parseDockerLikeEnvironmentVariables';

// Nerdctl (nerdctl) inspect image output - similar to Docker with some optional fields
const NerdctlInspectImageConfigSchema = z.object({
    Entrypoint: z.union([z.array(z.string()), z.string(), z.null()]).optional(),
    Cmd: z.union([z.array(z.string()), z.string(), z.null()]).optional(),
    Env: z.array(z.string()).optional().nullable(),
    Labels: z.record(z.string(), z.string()).nullable().optional(),
    ExposedPorts: z.record(z.string(), z.unknown()).nullable().optional(),
    Volumes: z.record(z.string(), z.unknown()).nullable().optional(),
    WorkingDir: z.string().nullable().optional(),
    User: z.string().nullable().optional(),
});

/**
 * Nerdctl inspect image schema with transforms for dates, architecture, and OS.
 */
export const NerdctlInspectImageRecordSchema = z.object({
    Id: z.string(),
    RepoTags: z.array(z.string()).optional().nullable(),
    Config: NerdctlInspectImageConfigSchema.optional(),
    RepoDigests: z.array(z.string()).optional().nullable(),
    // Architecture normalized to 'amd64' | 'arm64' | undefined
    Architecture: architectureStringSchema.optional(),
    // OS normalized to 'linux' | 'windows' | undefined
    Os: osTypeStringSchema.optional(),
    // Date string transformed to Date object
    Created: dateStringSchema.nullable().optional(),
    User: z.string().optional(),
});

export type NerdctlInspectImageRecord = z.infer<typeof NerdctlInspectImageRecordSchema>;

/**
 * Normalize a parsed NerdctlInspectImageRecord to the common InspectImagesItem format.
 * Many transformations are already done by the schema.
 */
export function normalizeNerdctlInspectImageRecord(image: NerdctlInspectImageRecord, raw: string): InspectImagesItem {
    const imageNameInfo: ImageNameInfo = parseDockerLikeImageName(image.RepoTags?.[0]);

    const environmentVariables = parseDockerLikeEnvironmentVariables(image.Config?.Env ?? []);

    const ports = Object.entries(image.Config?.ExposedPorts ?? {})
        .map<PortBinding | null>(([rawPort]) => {
            const [port, protocol] = rawPort.split('/');
            const containerPort = parseInt(port, 10);
            // Skip entries where port parsing fails
            if (!Number.isFinite(containerPort)) {
                return null;
            }
            return {
                containerPort,
                protocol: protocol?.toLowerCase() === 'tcp' ? 'tcp' : protocol?.toLowerCase() === 'udp' ? 'udp' : undefined,
            };
        })
        .filter((port): port is PortBinding => port !== null);

    const volumes = Object.entries(image.Config?.Volumes ?? {}).map<string>(([rawVolume]) => rawVolume);

    const labels = image.Config?.Labels ?? {};

    const isLocalImage = !(image.RepoDigests ?? []).some((digest) => !digest.toLowerCase().startsWith('localhost/'));

    return {
        id: image.Id,
        image: imageNameInfo,
        repoDigests: image.RepoDigests ?? [],
        isLocalImage,
        environmentVariables,
        ports,
        volumes,
        labels,
        entrypoint: toArray(image.Config?.Entrypoint || []),
        command: toArray(image.Config?.Cmd || []),
        currentDirectory: image.Config?.WorkingDir || undefined,
        // Architecture and OS are already normalized by the schema
        architecture: image.Architecture,
        operatingSystem: image.Os,
        // Date is already parsed by the schema
        createdAt: image.Created ?? undefined,
        // Prefer Config.User but fall back to top-level User if not present
        user: image.Config?.User ?? image.User ?? undefined,
        raw,
    };
}
