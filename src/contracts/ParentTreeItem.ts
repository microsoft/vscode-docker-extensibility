/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RegistryTreeItem } from "./RegistryTreeItem";
import { CancellationToken } from "vscode";

/**
 * Interface for a `RegistryTreeItem` with children. Part of the `CustomDockerRegistryProvider` implementation.
 */
export interface ParentTreeItem extends RegistryTreeItem {
    /**
     * Gets the child items for this tree node
     * @param token Cancellation token
     */
    getChildTreeItems(token: CancellationToken): Promise<RegistryTreeItem[]>;
}
