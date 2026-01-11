/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from 'zod/v4';
import { EventAction, EventType } from '../../contracts/ZodEnums';

/**
 * Finch/nerdctl outputs containerd native events, NOT Docker-compatible events.
 * The format is significantly different from Docker's event format.
 *
 * Example output:
 * {
 *   "Timestamp": "2026-01-10T23:38:26.737324778Z",
 *   "ID": "",
 *   "Namespace": "finch",
 *   "Topic": "/containers/create",
 *   "Status": "unknown",
 *   "Event": "{\"id\":\"...\",\"image\":\"...\",\"runtime\":{...}}"
 * }
 */
export const FinchEventRecordSchema = z.object({
    Timestamp: z.string(),
    ID: z.string().optional(),
    Namespace: z.string().optional(),
    Topic: z.string(),
    Status: z.string().optional(),
    // Event is a JSON string containing additional details
    Event: z.string().optional(),
});

export type FinchEventRecord = z.infer<typeof FinchEventRecordSchema>;

/**
 * Mapping from containerd topics to Docker-like event types and actions.
 * containerd uses topics like "/containers/create", "/images/delete", etc.
 */
const topicToTypeActionMap: Record<string, { type: EventType; action: EventAction } | undefined> = {
    '/containers/create': { type: 'container', action: 'create' },
    '/containers/delete': { type: 'container', action: 'destroy' },
    '/containers/update': { type: 'container', action: 'update' },
    '/tasks/start': { type: 'container', action: 'start' },
    '/tasks/exit': { type: 'container', action: 'stop' },
    '/tasks/delete': { type: 'container', action: 'delete' },
    '/tasks/paused': { type: 'container', action: 'pause' },
    '/images/create': { type: 'image', action: 'create' },
    '/images/delete': { type: 'image', action: 'delete' },
    '/images/update': { type: 'image', action: 'update' },
};

/**
 * Parse the containerd topic string to extract type and action.
 * Topics are in format: /type/action (e.g., /containers/create, /tasks/start)
 */
export function parseContainerdTopic(topic: string): { type: EventType; action: EventAction } | undefined {
    // First check exact matches
    const exactMatch = topicToTypeActionMap[topic];
    if (exactMatch) {
        return exactMatch;
    }

    // Try to parse from topic format: /category/action
    const parts = topic.split('/').filter(Boolean);
    if (parts.length >= 2) {
        const category = parts[0];
        const action = parts[1];

        // Map category to Docker event type
        let type: EventType;
        switch (category) {
            case 'containers':
                type = 'container';
                break;
            case 'tasks':
                type = 'container'; // Tasks are container-related
                break;
            case 'images':
                type = 'image';
                break;
            case 'networks':
                type = 'network';
                break;
            case 'volumes':
                type = 'volume';
                break;
            case 'snapshot':
                // Snapshot events are internal containerd events, not typically exposed in Docker
                return undefined;
            default:
                type = category;
        }

        return { type, action };
    }

    return undefined;
}

/**
 * Parse the nested Event JSON string to extract the actor ID.
 * The Event field contains a JSON object with an "id" field for containers.
 */
export function parseContainerdEventPayload(eventJson: string | undefined): { id: string; attributes: Record<string, unknown> } {
    if (!eventJson) {
        return { id: '', attributes: {} };
    }

    try {
        const parsed = JSON.parse(eventJson) as Record<string, unknown>;
        const id = (typeof parsed.id === 'string' ? parsed.id : '') ||
                   (typeof parsed.key === 'string' ? parsed.key : ''); // snapshot events use 'key'

        // Extract relevant attributes
        const attributes: Record<string, unknown> = {};
        if (typeof parsed.image === 'string') {
            attributes.image = parsed.image;
        }
        if (typeof parsed.name === 'string') {
            attributes.name = parsed.name;
        }

        return { id, attributes };
    } catch {
        return { id: '', attributes: {} };
    }
}
