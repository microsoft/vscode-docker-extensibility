/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from "vscode";
import { DockerTag } from "./DockerTag";
import { RegistryTreeItem } from "./RegistryTreeItem";

/**
 * Interface for a Docker repository
 */
export interface DockerRepository extends RegistryTreeItem {
    /**
     * Gets all the tags for this repository. Should also update the cache.
     * @param token Cancellation token
     */
    getTags(token: CancellationToken): Promise<DockerTag[]>;

    /**
     * Gets all the tags for this repository from cache
     * @param token Cancellation token
     */
    getCachedTags(token: CancellationToken): Promise<DockerTag[]>;

    /**
     * Deletes a repository. This method is optional.
     * @param token Cancellation token
     */
    delete?(token: CancellationToken): Promise<void>;
}
