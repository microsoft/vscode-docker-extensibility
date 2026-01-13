/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { z } from 'zod/v4';
import { Labels } from './ContainerClient';

dayjs.extend(utc);

/**
 * Schema that transforms a date string to a Date object.
 * Returns undefined if the date is invalid.
 */
export const dateStringSchema = z.string().transform((str): Date | undefined => {
    const parsed = dayjs.utc(str);
    return parsed.isValid() ? parsed.toDate() : undefined;
});

/**
 * Schema that transforms a date string to a Date object with a fallback to current time.
 * Never returns undefined - always provides a valid Date.
 */
export const dateStringWithFallbackSchema = z.string().transform((str): Date => {
    const parsed = dayjs.utc(str);
    return parsed.isValid() ? parsed.toDate() : new Date();
});

/**
 * Schema that transforms "true"/"false" strings to boolean values.
 * Case-insensitive. Returns false for any other value.
 */
export const booleanStringSchema = z.string().transform((str): boolean => {
    return str.toLowerCase() === 'true';
});

/**
 * Schema that transforms Docker-like label strings to a Record<string, string>.
 * Handles comma-separated "key=value" format.
 * Empty strings result in an empty object.
 */
export const labelsStringSchema = z.string().transform((rawLabels): Labels => {
    if (!rawLabels || rawLabels.trim() === '') {
        return {};
    }
    return rawLabels.split(',').reduce((labels, labelPair) => {
        const index = labelPair.indexOf('=');
        if (index > 0) {
            labels[labelPair.substring(0, index)] = labelPair.substring(index + 1);
        }
        return labels;
    }, {} as Labels);
});

/**
 * Schema that handles labels as either a string (to be parsed) or already an object.
 * This is common in Docker/nerdctl outputs where labels can come in either format.
 */
export const labelsSchema = z.union([
    labelsStringSchema,
    z.record(z.string(), z.string()),
]).transform((val): Labels => val ?? {});

/**
 * Schema that normalizes OS type strings to 'linux' | 'windows' | undefined.
 * Case-insensitive matching.
 */
export const osTypeStringSchema = z.string().transform((str): 'linux' | 'windows' | undefined => {
    const lower = str.toLowerCase();
    if (lower === 'linux') return 'linux';
    if (lower === 'windows') return 'windows';
    return undefined;
});

/**
 * Schema that normalizes architecture strings to 'amd64' | 'arm64' | undefined.
 * Case-insensitive matching.
 */
export const architectureStringSchema = z.string().transform((str): 'amd64' | 'arm64' | undefined => {
    const lower = str.toLowerCase();
    if (lower === 'amd64' || lower === 'x86_64') return 'amd64';
    if (lower === 'arm64' || lower === 'aarch64') return 'arm64';
    return undefined;
});

/**
 * Schema that normalizes protocol strings to 'tcp' | 'udp' | undefined.
 * Case-insensitive matching.
 */
export const protocolStringSchema = z.string().transform((str): 'tcp' | 'udp' | undefined => {
    const lower = str.toLowerCase();
    if (lower === 'tcp') return 'tcp';
    if (lower === 'udp') return 'udp';
    return undefined;
});

/**
 * Schema for parsing port/protocol strings like "8080/tcp" or "53/udp".
 * Returns an object with containerPort (number) and protocol.
 */
export const portProtocolStringSchema = z.string().transform((str): { containerPort: number; protocol: 'tcp' | 'udp' | undefined } | undefined => {
    const [portStr, protocolStr] = str.split('/');
    const containerPort = parseInt(portStr, 10);
    if (!Number.isFinite(containerPort)) {
        return undefined;
    }
    const protocol = protocolStr?.toLowerCase() === 'tcp'
        ? 'tcp'
        : protocolStr?.toLowerCase() === 'udp'
            ? 'udp'
            : undefined;
    return { containerPort, protocol };
});

/**
 * Schema that transforms a string number to an actual number.
 * Returns undefined if parsing fails.
 */
export const numericStringSchema = z.string().transform((str): number | undefined => {
    const num = parseInt(str, 10);
    return Number.isFinite(num) ? num : undefined;
});

/**
 * Schema that normalizes container state strings to standard states.
 * Handles various formats from Docker, Podman, and nerdctl.
 */
export const containerStateStringSchema = z.string().transform((status): 'created' | 'running' | 'paused' | 'restarting' | 'removing' | 'exited' | 'dead' | undefined => {
    const lowerStatus = status.toLowerCase();

    if (lowerStatus.startsWith('up') || lowerStatus === 'running') {
        return 'running';
    }
    if (lowerStatus.startsWith('exited') || lowerStatus.startsWith('exit')) {
        return 'exited';
    }
    if (lowerStatus === 'created') {
        return 'created';
    }
    if (lowerStatus === 'paused') {
        return 'paused';
    }
    if (lowerStatus === 'restarting') {
        return 'restarting';
    }
    if (lowerStatus === 'removing') {
        return 'removing';
    }
    if (lowerStatus === 'dead') {
        return 'dead';
    }

    return undefined;
});

/**
 * Helper to create an optional version of any transform schema.
 * The transform is only applied if the value is present.
 */
export function optionalTransform<T extends z.ZodType>(schema: T) {
    return schema.optional();
}
