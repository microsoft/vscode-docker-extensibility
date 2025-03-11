/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from 'zod';
import { EventActionSchema, EventTypeSchema } from '../../contracts/ZodEnums';

export const DockerEventRecordSchema = z.object({
    Type: EventTypeSchema,
    Action: EventActionSchema,
    Actor: z.object({
        ID: z.string(),
        Attributes: z.record(z.unknown())
    }),
    time: z.number(),
});
