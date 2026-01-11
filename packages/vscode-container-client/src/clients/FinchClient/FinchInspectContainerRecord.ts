/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { toArray } from '@microsoft/vscode-processutils';
import { z } from 'zod/v4';
import { InspectContainersItem, InspectContainersItemBindMount, InspectContainersItemMount, InspectContainersItemNetwork, InspectContainersItemVolumeMount, PortBinding } from '../../contracts/ContainerClient';
import { dayjs } from '../../utils/dayjs';
import { parseDockerLikeImageName } from '../../utils/parseDockerLikeImageName';
import { normalizeIpAddress } from '../DockerClientBase/normalizeIpAddress';
import { parseDockerLikeEnvironmentVariables } from '../DockerClientBase/parseDockerLikeEnvironmentVariables';

// Finch (nerdctl) inspect container output - Docker-compatible format
const FinchInspectContainerPortHostSchema = z.object({
    HostIp: z.string().optional(),
    HostPort: z.string().optional(),
});

const FinchInspectContainerBindMountSchema = z.object({
    Type: z.literal('bind'),
    Source: z.string(),
    Destination: z.string(),
    RW: z.boolean().optional(),
});

const FinchInspectContainerVolumeMountSchema = z.object({
    Type: z.literal('volume'),
    Name: z.string(),
    Source: z.string(),
    Destination: z.string(),
    Driver: z.string().optional(),
    RW: z.boolean().optional(),
});

const FinchInspectContainerMountSchema = z.union([
    FinchInspectContainerBindMountSchema,
    FinchInspectContainerVolumeMountSchema,
]);

const FinchInspectNetworkSchema = z.object({
    Gateway: z.string().optional(),
    IPAddress: z.string().optional(),
    MacAddress: z.string().optional(),
});

const FinchInspectContainerConfigSchema = z.object({
    Image: z.string().optional(), // May not be present in all nerdctl versions
    Entrypoint: z.union([z.array(z.string()), z.string(), z.null()]).optional(),
    Cmd: z.union([z.array(z.string()), z.string(), z.null()]).optional(),
    Env: z.array(z.string()).nullable().optional(),
    Labels: z.record(z.string(), z.string()).nullable().optional(),
    WorkingDir: z.string().nullable().optional(),
});

const FinchInspectContainerHostConfigSchema = z.object({
    PublishAllPorts: z.boolean().nullable().optional(),
    Isolation: z.string().optional(),
});

const FinchInspectContainerNetworkSettingsSchema = z.object({
    Networks: z.record(z.string(), FinchInspectNetworkSchema).nullable().optional(),
    IPAddress: z.string().optional(),
    Ports: z.record(z.string(), z.array(FinchInspectContainerPortHostSchema).nullable()).nullable().optional(),
});

const FinchInspectContainerStateSchema = z.object({
    Status: z.string().optional(),
    StartedAt: z.string().optional(),
    FinishedAt: z.string().optional(),
});

export const FinchInspectContainerRecordSchema = z.object({
    Id: z.string(),
    Name: z.string(),
    Image: z.string(),
    Created: z.string(),
    Mounts: z.array(FinchInspectContainerMountSchema).optional(),
    State: FinchInspectContainerStateSchema.optional(),
    Config: FinchInspectContainerConfigSchema.optional(),
    HostConfig: FinchInspectContainerHostConfigSchema.optional(),
    NetworkSettings: FinchInspectContainerNetworkSettingsSchema.optional(),
});

type FinchInspectContainerRecord = z.infer<typeof FinchInspectContainerRecordSchema>;

export function normalizeFinchInspectContainerRecord(container: FinchInspectContainerRecord, raw: string): InspectContainersItem {
    const environmentVariables = parseDockerLikeEnvironmentVariables(container.Config?.Env ?? []);

    const networks = Object.entries(container.NetworkSettings?.Networks ?? {}).map<InspectContainersItemNetwork>(([name, network]) => {
        return {
            name,
            gateway: network.Gateway || undefined,
            ipAddress: normalizeIpAddress(network.IPAddress),
            macAddress: network.MacAddress || undefined,
        };
    });

    const ports = Object.entries(container.NetworkSettings?.Ports ?? {})
        .map<PortBinding | null>(([rawPort, hostBinding]) => {
            const [port, protocol] = rawPort.split('/');
            const containerPort = parseInt(port, 10);
            // Skip entries with invalid container port
            if (!Number.isFinite(containerPort)) {
                return null;
            }
            const hostPortParsed = hostBinding?.[0]?.HostPort ? parseInt(hostBinding[0].HostPort, 10) : undefined;
            // Only include hostPort if it's a valid number
            const hostPort = hostPortParsed !== undefined && Number.isFinite(hostPortParsed) ? hostPortParsed : undefined;
            return {
                hostIp: normalizeIpAddress(hostBinding?.[0]?.HostIp),
                hostPort,
                containerPort,
                protocol: protocol?.toLowerCase() === 'tcp'
                    ? 'tcp'
                    : protocol?.toLowerCase() === 'udp'
                        ? 'udp'
                        : undefined,
            };
        })
        .filter((port): port is PortBinding => port !== null);

    const mounts = (container.Mounts ?? []).reduce<Array<InspectContainersItemMount>>((curMounts, mount) => {
        switch (mount?.Type) {
            case 'bind':
                return [...curMounts, {
                    type: 'bind',
                    source: mount.Source,
                    destination: mount.Destination,
                    readOnly: mount.RW === false,
                } satisfies InspectContainersItemBindMount];
            case 'volume':
                return [...curMounts, {
                    type: 'volume',
                    source: mount.Name,
                    destination: mount.Destination,
                    driver: mount.Driver || 'local',
                    readOnly: mount.RW === false,
                } satisfies InspectContainersItemVolumeMount];
            default:
                // Skip unknown mount types (e.g., tmpfs, npipe)
                return curMounts;
        }
    }, []);

    const labels = container.Config?.Labels ?? {};

    const createdAt = dayjs.utc(container.Created);
    const startedAt = container.State?.StartedAt
        ? dayjs.utc(container.State?.StartedAt)
        : undefined;
    const finishedAt = container.State?.FinishedAt
        ? dayjs.utc(container.State?.FinishedAt)
        : undefined;

    return {
        id: container.Id,
        name: container.Name,
        imageId: container.Image,
        image: parseDockerLikeImageName(container.Config?.Image || container.Image),
        isolation: container.HostConfig?.Isolation,
        status: container.State?.Status,
        environmentVariables,
        networks,
        ipAddress: normalizeIpAddress(container.NetworkSettings?.IPAddress),
        ports,
        mounts,
        labels,
        entrypoint: toArray(container.Config?.Entrypoint ?? []),
        command: toArray(container.Config?.Cmd ?? []),
        currentDirectory: container.Config?.WorkingDir || undefined,
        createdAt: createdAt.toDate(),
        startedAt: startedAt && (startedAt.isSame(createdAt) || startedAt.isAfter(createdAt))
            ? startedAt.toDate()
            : undefined,
        finishedAt: finishedAt && (finishedAt.isSame(createdAt) || finishedAt.isAfter(createdAt))
            ? finishedAt.toDate()
            : undefined,
        raw,
    };
}
