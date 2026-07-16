/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PortBinding } from '../../contracts/ContainerClient';
import { normalizeIpAddress } from './normalizeIpAddress';

const shortFormRegex = /^(?<containerPort>\d+)\/(?<protocol>tcp|udp)$/i;

// Supports:
// - hostPort->containerPort[/protocol]
// - hostIp:hostPort->containerPort[/protocol]
// - [ipv6]:hostPort->containerPort[/protocol]
const longFormRegex = /^(?:(?<hostPortOnly>\d+)|(?<hostIpOrHost>[^:\s[\]]+):(?<hostPort>\d+)|\[(?<hostIpv6>[^\]]+)\]:(?<hostPortV6>\d+))\s*->\s*(?<containerPort>\d+)(?:\/(?<protocol>tcp|udp))?$/i;

/**
 * Attempt to parse a Docker-like raw port binding string
 * @param portString the raw port string to parse, e.g. "1234/tcp" or "0.0.0.0:1234->1234/udp"
 * @returns Parsed raw port string as a PortBinding record or undefined if invalid
 */
export function parseDockerRawPortString(portString: string): PortBinding | undefined {
    const trimmed = portString.trim();
    if (!trimmed) {
        return undefined;
    }

    const shortMatch = shortFormRegex.exec(trimmed);
    if (shortMatch?.groups) {
        return {
            containerPort: Number.parseInt(shortMatch.groups.containerPort, 10),
            protocol: shortMatch.groups.protocol.toLowerCase() as 'tcp' | 'udp',
        };
    }

    const longMatch = longFormRegex.exec(trimmed);
    if (!longMatch?.groups) {
        return undefined;
    }

    const hostPortRaw = longMatch.groups.hostPortOnly
        ?? longMatch.groups.hostPort
        ?? longMatch.groups.hostPortV6;
    if (!hostPortRaw) {
        return undefined;
    }

    const hostIp = normalizeIpAddress(longMatch.groups.hostIpv6 ?? longMatch.groups.hostIpOrHost);
    const protocol = (longMatch.groups.protocol?.toLowerCase() as 'tcp' | 'udp' | undefined) ?? 'tcp';

    return {
        ...(hostIp !== undefined ? { hostIp } : {}),
        hostPort: Number.parseInt(hostPortRaw, 10),
        containerPort: Number.parseInt(longMatch.groups.containerPort, 10),
        protocol,
    };
}
