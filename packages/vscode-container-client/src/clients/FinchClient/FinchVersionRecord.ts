/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from 'zod/v4';

// Finch (nerdctl) version output structure
// nerdctl uses a different version format than Docker
export const FinchVersionRecordSchema = z.object({
    Client: z.object({
        Version: z.string().optional(),
        GitCommit: z.string().optional(),
        GoVersion: z.string().optional(),
        Os: z.string().optional(),
        Arch: z.string().optional(),
    }),
    Server: z.object({
        Components: z.array(z.object({
            Name: z.string(),
            Version: z.string(),
            Details: z.record(z.string(), z.unknown()).optional(),
        })).optional(),
    }).optional(),
});
