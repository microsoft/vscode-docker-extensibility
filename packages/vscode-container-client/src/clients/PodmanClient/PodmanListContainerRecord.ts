/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from 'zod/mini';

const PodmanPortBindingSchema = z.object({
    /* eslint-disable @typescript-eslint/naming-convention */
    host_ip: z.optional(z.string()),
    container_port: z.number(),
    host_port: z.optional(z.number()),
    protocol: z.enum(['udp', 'tcp']),
    /* eslint-enable @typescript-eslint/naming-convention */
});

export const PodmanListContainerRecordSchema = z.object({
    Id: z.string(),
    Names: z.array(z.string()),
    Image: z.string(),
    Ports: z.nullable(z.optional(z.array(PodmanPortBindingSchema))),
    Networks: z.nullable(z.optional(z.array(z.string()))),
    Labels: z.nullable(z.optional(z.record(z.string(), z.string()))),
    Created: z.number(),
    State: z.string(),
    Status: z.string(),
});

export type PodmanListContainerRecord = z.infer<typeof PodmanListContainerRecordSchema>;
