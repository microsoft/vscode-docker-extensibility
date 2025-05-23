/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ImageNameInfo, InspectImagesItem, PortBinding } from "../../contracts/ContainerClient";
import { dayjs } from '../../utils/dayjs';
import { parseDockerLikeImageName } from "../../utils/parseDockerLikeImageName";
import { toArray } from "../../utils/toArray";
import { parseDockerLikeEnvironmentVariables } from "../DockerClientBase/parseDockerLikeEnvironmentVariables";

export type PodmanInspectImageConfig = {
    Entrypoint?: Array<string> | string | null;
    Cmd?: Array<string> | string | null;
    Env?: Array<string>,
    ExposedPorts?: Record<string, unknown> | null;

    // TODO: validate these remaining properties
    Volumes?: Record<string, unknown> | null;
    WorkingDir?: string | null;
    User?: string | null;
};

export type PodmanInspectImageRecord = {
    Id: string;
    RepoTags: Array<string>;
    Config: PodmanInspectImageConfig,
    RepoDigests: Array<string>;
    Architecture: string;
    Os: string;
    Labels: Record<string, string> | null;
    Created: string;
    User?: string; // TODO validate
};

function isPodmanInspectImageConfig(maybeImageConfig: unknown): maybeImageConfig is PodmanInspectImageConfig {
    const imageConfig = maybeImageConfig as PodmanInspectImageConfig;

    if (!imageConfig || typeof imageConfig !== 'object') {
        return false;
    }

    if (imageConfig.Env && !Array.isArray(imageConfig.Env)) {
        return false;
    }

    if (imageConfig.ExposedPorts && typeof imageConfig.ExposedPorts !== 'object') {
        return false;
    }

    if (imageConfig.Volumes && typeof imageConfig.Volumes !== 'object') {
        return false;
    }

    if (imageConfig.WorkingDir && typeof imageConfig.WorkingDir !== 'string') {
        return false;
    }

    if (imageConfig.User && typeof imageConfig.User !== 'string') {
        return false;
    }

    if (imageConfig.Entrypoint && !Array.isArray(imageConfig.Entrypoint) && typeof imageConfig.Entrypoint !== 'string') {
        return false;
    }

    if (imageConfig.Cmd && !Array.isArray(imageConfig.Cmd) && typeof imageConfig.Cmd !== 'string') {
        return false;
    }

    return true;
}

export function isPodmanInspectImageRecord(maybeImage: unknown): maybeImage is PodmanInspectImageRecord {
    const image = maybeImage as PodmanInspectImageRecord;

    if (!image || typeof image !== 'object') {
        return false;
    }

    if (typeof image.Id !== 'string') {
        return false;
    }

    if (!Array.isArray(image.RepoTags)) {
        return false;
    }

    if (!isPodmanInspectImageConfig(image.Config)) {
        return false;
    }

    if (!Array.isArray(image.RepoDigests)) {
        return false;
    }

    if (typeof image.Architecture !== 'string') {
        return false;
    }

    if (typeof image.Os !== 'string') {
        return false;
    }

    if (typeof image.Created !== 'string') {
        return false;
    }

    if (image.Labels && typeof image.Labels !== 'object') {
        return false;
    }

    return true;
}

export function normalizePodmanInspectImageRecord(image: PodmanInspectImageRecord): InspectImagesItem {
    // This is effectively doing firstOrDefault on the RepoTags for the image. If there are any values
    // in RepoTags, the first one will be parsed and returned as the tag name for the image.
    const imageNameInfo: ImageNameInfo = parseDockerLikeImageName(image.RepoTags?.[0]);

    // Parse any environment variables defined for the image
    const environmentVariables = parseDockerLikeEnvironmentVariables(image.Config?.Env || []);

    // Parse any default ports exposed by the image
    const ports = Object.entries(image.Config?.ExposedPorts || {}).map<PortBinding>(([rawPort]) => {
        const [port, protocol] = rawPort.split('/');
        return {
            containerPort: parseInt(port),
            protocol: protocol.toLowerCase() === 'tcp' ? 'tcp' : protocol.toLowerCase() === 'udp' ? 'udp' : undefined,
        };
    });

    // Parse any default volumes specified by the image
    const volumes = Object.entries(image.Config?.Volumes || {}).map<string>(([rawVolume]) => rawVolume);

    // Parse any labels assigned to the image
    const labels = image.Labels ?? {};

    // Parse and normalize the image architecture
    const architecture = image.Architecture?.toLowerCase() === 'amd64'
        ? 'amd64'
        : image.Architecture?.toLowerCase() === 'arm64' ? 'arm64' : undefined;

    // Parse and normalize the image OS
    const os = image.Os?.toLowerCase() === 'linux'
        ? 'linux'
        : image.Architecture?.toLowerCase() === 'windows'
            ? 'windows'
            : undefined;

    // Determine if the image has been pushed to a remote repo
    // (no repo digests or only localhost/ repo digests)
    const isLocalImage = !(image.RepoDigests || []).some((digest) => !digest.toLowerCase().startsWith('localhost/'));

    return {
        id: image.Id,
        image: imageNameInfo,
        repoDigests: image.RepoDigests,
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
        createdAt: dayjs(image.Created).toDate(),
        user: image?.User || undefined,
        raw: JSON.stringify(image),
    };
}
