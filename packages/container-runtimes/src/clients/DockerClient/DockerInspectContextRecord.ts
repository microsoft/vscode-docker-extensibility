/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerContextType } from "./DockerContextType";

export type DockerInspectContextRecord = {
    Name: string;
    ContextType: DockerContextType;
    Description?: string;
    Raw: string;
};

// TODO: Actually test properties
export function isDockerInspectContextRecord(maybeContext: unknown): maybeContext is DockerInspectContextRecord {
    return true;
}
