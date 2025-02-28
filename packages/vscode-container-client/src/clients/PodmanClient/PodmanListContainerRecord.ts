/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from '../../utils/zod';

const PodmanPortBindingSchema = z.object({
    /* eslint-disable @typescript-eslint/naming-convention */
    host_ip: z.string().optional(),
    container_port: z.number(),
    host_port: z.number().optional(),
    protocol: z.enum(['udp', 'tcp']),
    /* eslint-enable @typescript-eslint/naming-convention */
});

export const PodmanListContainerRecordSchema = z.object({
    Id: z.string(),
    Names: z.array(z.string()),
    Image: z.string(),
    Ports: z.array(PodmanPortBindingSchema).optional(),
    Networks: z.array(z.string()).optional(),
    Labels: z.record(z.string()).optional(),
    Created: z.number(),
    State: z.string(),
    Status: z.string(),
});

export type PodmanListContainerRecord = z.infer<typeof PodmanListContainerRecordSchema>;
