/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from '../../utils/zod';

export const PodmanListNetworkRecordSchema = z.object({
    Name: z.string().optional(), // v3
    name: z.string().optional(), // Not in v3
    id: z.string().optional(), // Not in v3
    driver: z.string().optional(), // Not in v3
    created: z.string().optional(), // Not in v3
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ipv6_enabled: z.boolean().optional(), // Not in v3
    internal: z.boolean().optional(), // Not in v3
    Labels: z.record(z.string()).optional(), // v3
    labels: z.record(z.string()).optional(), // Maybe in v4?
});
