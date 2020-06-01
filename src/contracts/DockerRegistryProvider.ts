/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from "vscode";
import { DockerRegistry } from "./DockerRegistry";
import { ParentTreeItem } from "./ParentTreeItem";
import { RegistryTreeItem } from "./RegistryTreeItem";

/**
 * Base interface for registry providers
 */
export interface DockerRegistryProviderBase extends RegistryTreeItem {
    /**
     * The registry provider ID. Must be universally unique and consisting only of alphanumeric characters.
     */
    readonly providerId: string;

    /**
     * Gets the registries for this provider. If this is implemented, `getChildTreeItems` should not be implemented. Should also update the cache.
     * @param token Cancellation token
     */
    getRegistries?(token: CancellationToken): Promise<DockerRegistry[]>;

    /**
     * Gets the registries for this provider from cache. If this is implemented, `getChildTreeItems` should not be implemented.
     * @param token Cancellation token
     */
    getCachedRegistries?(token: CancellationToken): Promise<DockerRegistry[]>;

    /**
     * Gets the child tree nodes for this provider. If this is implemented, `getRegistries` / `getCachedRegistries` should not be implemented.
     * @param token Cancellation token
     */
    getChildTreeItems?(token: CancellationToken): Promise<RegistryTreeItem[]>;

    /**
     * Connects a registry. UI prompts should be implemented to gather the necessary information to connect. This method is optional if a provider can determine all the necessary information on its own without prompts.
     * @param token Cancellation token
     */
    connectRegistry?(token: CancellationToken): Promise<DockerRegistry>;

    /**
     * Disconnects a registry
     */
    disconnectRegistry?(registry: DockerRegistry): Promise<void>;
}

/**
 * Interface for a basic registry provider that implements `getRegistries`, to provide a set of registries, repositories, and tags
 */
export interface BasicDockerRegistryProvider extends DockerRegistryProviderBase {
    // @inheritdoc
    getRegistries(token: CancellationToken): Promise<DockerRegistry[]>;

    // @inheritdoc
    getCachedRegistries(token: CancellationToken): Promise<DockerRegistry[]>;
}

/**
 * Interface for a custom registry provider that implements `getChildTreeItems`, to provide an arbitrary tree of nodes
 */
export interface CustomDockerRegistryProvider extends DockerRegistryProviderBase, ParentTreeItem {
    // @inheritdoc
    getChildTreeItems(token: CancellationToken): Promise<RegistryTreeItem[]>;
}
