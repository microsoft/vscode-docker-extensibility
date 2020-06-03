/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RegistryTreeItem } from "./RegistryTreeItem";

/**
 * When context/palette commands are called on nodes under the basic provider model,
 * the command will be given arguments in the form of: `CommandContext?`, `CommandContext[]?`
 * Where the first is the selected node, and the second is the list of selected nodes
 */
export interface CommandContext {
    /**
     * The original `RegistryTreeItem` used to create this tree node
     */
    readonly originalObject: RegistryTreeItem;
}
