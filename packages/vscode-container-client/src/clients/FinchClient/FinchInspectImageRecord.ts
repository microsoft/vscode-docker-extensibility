/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { toArray } from '@microsoft/vscode-processutils';
import { z } from 'zod/v4';
import { ImageNameInfo, InspectImagesItem, PortBinding } from '../../contracts/ContainerClient';
import { dayjs } from '../../utils/dayjs';
import { parseDockerLikeImageName } from '../../utils/parseDockerLikeImageName';
import { parseDockerLikeEnvironmentVariables } from '../DockerClientBase/parseDockerLikeEnvironmentVariables';

// Finch (nerdctl) inspect image output - similar to Docker with some optional fields
const FinchInspectImageConfigSchema = z.object({
    Entrypoint: z.union([z.array(z.string()), z.string(), z.null()]).optional(),
    Cmd: z.union([z.array(z.string()), z.string(), z.null()]).optional(),
    Env: z.array(z.string()).optional().nullable(),
    Labels: z.record(z.string(), z.string()).nullable().optional(),
    ExposedPorts: z.record(z.string(), z.unknown()).nullable().optional(),
    Volumes: z.record(z.string(), z.unknown()).nullable().optional(),
    WorkingDir: z.string().nullable().optional(),
    User: z.string().nullable().optional(),
});

export const FinchInspectImageRecordSchema = z.object({
    Id: z.string(),
    RepoTags: z.array(z.string()).optional().nullable(),
    Config: FinchInspectImageConfigSchema.optional(),
    RepoDigests: z.array(z.string()).optional().nullable(),
    Architecture: z.string().optional(),
    Os: z.string().optional(),
    Created: z.string().nullable().optional(),
    User: z.string().optional(),
});

type FinchInspectImageRecord = z.infer<typeof FinchInspectImageRecordSchema>;

export function normalizeFinchInspectImageRecord(image: FinchInspectImageRecord, raw: string): InspectImagesItem {
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

    const architecture = image.Architecture?.toLowerCase() === 'amd64'
        ? 'amd64'
        : image.Architecture?.toLowerCase() === 'arm64' ? 'arm64' : undefined;

    const os = image.Os?.toLowerCase() === 'linux'
        ? 'linux'
        : image.Os?.toLowerCase() === 'windows'
            ? 'windows'
            : undefined;

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
        architecture,
        operatingSystem: os,
        createdAt: image.Created ? (() => {
            const parsed = dayjs(image.Created);
            return parsed.isValid() ? parsed.toDate() : undefined;
        })() : undefined,
        // Prefer Config.User but fall back to top-level User if not present
        user: image.Config?.User ?? image.User ?? undefined,
        raw,
    };
}
