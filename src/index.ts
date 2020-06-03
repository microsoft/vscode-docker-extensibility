/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Interface the Docker extension implements
export { DockerExtension } from "./contracts/DockerExtension";

// Interface of a registry provider
export { DockerRegistryProviderBase, BasicDockerRegistryProvider, CustomDockerRegistryProvider } from "./contracts/DockerRegistryProvider";
export { DockerRegistry } from "./contracts/DockerRegistry";
export { DockerRepository } from "./contracts/DockerRepository";
export { DockerTag } from "./contracts/DockerTag";
export { ParentTreeItem } from "./contracts/ParentTreeItem";
export { RegistryTreeItem } from "./contracts/RegistryTreeItem";

// Other interfaces
export { CommandContext } from "./contracts/CommandContext";
export { DockerCredentials } from "./contracts/DockerCredentials";
