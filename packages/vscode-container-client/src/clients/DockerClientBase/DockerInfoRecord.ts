/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerOSSchema } from '../../contracts/ZodEnums';
import { z } from '../../utils/zod';

export const DockerInfoRecordSchema = z.object({
    OperatingSystem: z.string().optional(),
    OSType: ContainerOSSchema.optional(),
});
