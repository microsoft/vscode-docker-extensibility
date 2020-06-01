# Docker Registry Provider Extensibility Model

## Overview
Several concerns around registry providers have motivated us to explore a better extensibility model for supplying additional providers. These include:

1. Scalability--we can't scale to implement and maintain a multitude of different registry providers
1. Openness--we don't want to be the arbiters of which registries get implemented and shown

In order to alleviate these concerns it is necessary to establish a better extensibility model. Adding a registry provider would involve creating an extension, which can communicate with the Docker extension to provide a view into a given registry. Optionally, the extension could also implement context and palette commands. With the correct context values on nodes, the existing context and palette commands will also work.

We would need to create a Node package containing the interfaces necessary to properly implement the provider, and most likely would also include a generic V2 provider in that package, since _most_ providers would be little more than a slim inheriting implementation on top of that.

---

## Implementing a registry provider
In order to connect to a given registry, the provider author must write the necessary code to authenticate and query their offering.

There are two ways to do this:

### 1. Strict registry structure
An extension would implement three primary methods (and some additional supporting methods):
1. Get the list of registries (or just one if it's a public registry)
1. For each registry, get the list of repositories
1. For each repository, get the list of tags

Implementing a registry provider this way would be very simple, but additional features (like ACR's subscriptions, tasks) would not be possible.

### 2. Show arbitrary tree structure
An extension would give a tree object which will show anything they wish. It will be more difficult to implement but offers far greater flexibility.

---

## Registering a registry provider
The Docker extension will implement an interface allowing for registry providers to register themselves with the extension. The extensions would need to call this registration method every time the Docker extension is activated, and can accomplish this by setting activation events on the Docker views and registry-related commands.

// TODO: A command that the Docker extension will call on activation to signal to all provider extensions that they should activate?

---

## Showing up in the provider pick list
In order to be used, an extension needs to show up in the quick pick list for registry providers. The list will consist of:

1. All providers for which the prerequisite(s) are installed (which would always include Docker Hub and the generic V2 provider), _and_ that have registered themselves at runtime with the Docker extension.
1. A manifest maintained in the Docker Extension repo will keep a list of known provider IDs, names, and dependent extensions. We will accept contributions to this manifest, with reasonable criteria such as:
    - We will spend at least a bit of time up front inspecting their source code for obvious problems
    - Their provider must be open-source
    - Their provider must not be redundant with existing ones
    - It's rather subjective, but their provider must appear like a serious effort that will be maintained in the future; not a passing side project

Optionally, we could also establish a tag that can be used by extensions to easily filter for them on the marketplace, and a link/command/etc. within the Docker extension to open the marketplace with that filter.

---

## Interfaces

### Docker extension

`DockerExtension`:
```typescript
/**
 * Interface implemented by the Docker extension.
 * @example const dockerExtension = vscode.extensions.getExtension<DockerExtension>('ms-azuretools.vscode-docker').exports;
 */
export interface DockerExtension {
    /**
     * Registers a registry provider with the Docker extension
     * @param provider The provider to register with the extension
     * @returns A disposable that, when disposed, will un-register the provider
     */
    registerDockerRegistryProvider(provider: BasicDockerRegistryProvider | CustomDockerRegistryProvider): Disposable;
}
```
Note: "register...Registry" is a bit of a tongue twister, but all of the VSCode API's similar methods use "register*"; consistency is good.

### Basic registry provider

`RegistryTreeItem`:
```typescript
/**
 * Interface for all nodes that appear in the Docker extension's explorer view for registries.
 * This is mostly-identical to `vscode.TreeItem` but intentionally does not extend it, because the object returned
 * will not be directly displayed--instead, the properties will be copied into an `AzExtTreeItem` from Node package `vscode-azureextensionui`.
 */
export interface RegistryTreeItem {
    /**
     * The label for the node
     */
    readonly label: string;

    /**
     * The context value for the node. In order to use the existing commands for registries in the Docker extension, this must contain // TODO
     */
    readonly contextValue: string;

    /**
     * The ID for the node. Optional. This is not the same as `providerId` / `registryId`.
     */
    readonly id?: string;

    /**
     * The icon for the node
     */
    readonly iconPath?: string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon;

    /**
     * The description for the node (rendered less prominently than the label)
     */
    readonly description?: string | boolean;

    /**
     * The tooltip for the node
     */
    readonly tooltip?: string;

    /**
     * The command to run when the node is left-clicked
     */
    readonly command?: Command;
}
```

`DockerRegistryProviderBase`:
```typescript
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
```

`BasicDockerRegistryProvider`:
```typescript
/**
 * Interface for a basic registry provider that implements `getRegistries`, to provide a set of registries, repositories, and tags
 */
export interface BasicDockerRegistryProvider extends DockerRegistryProviderBase {
    // @inheritdoc
    getRegistries(token: CancellationToken): Promise<DockerRegistry[]>;

    // @inheritdoc
    getCachedRegistries(token: CancellationToken): Promise<DockerRegistry[]>;
}
```

`DockerRegistry`:
```typescript
/**
 * Interface for a Docker registry. A registry contains a set of repositories.
 */
export interface DockerRegistry extends RegistryTreeItem {
    /**
     * The base image path, prepended to the image name when pushing.
     */
    readonly baseImagePath: string;

    /**
     * The registry ID. Must be unique within the registry provider, and consisting only of alphanumeric characters.
     */
    readonly registryId: string;

    /**
     * Gets the repositories that are contained in this registry. Should also update the cache.
     * @param token Cancellation token
     */
    getRepositories(token: CancellationToken): Promise<DockerRepository[]>;

    /**
     * Gets the repositories that are contained in this registry from cache
     * @param token Cancellation token
     */
    getCachedRepositories(token: CancellationToken): Promise<DockerRepository[]>;

    /**
     * Gets the login credentials for this registry
     * @param token Cancellation token
     */
    getDockerLoginCredentials?(token: CancellationToken): Promise<DockerCredentials>;
}
```

`DockerRepository`:
```typescript
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
```

`DockerTag`:
```typescript
/**
 * Interface for a Docker tag
 */
export interface DockerTag extends RegistryTreeItem {
    /**
     * Deletes a tag. This method is optional.
     * @param token Cancellation token
     */
    delete?(token: CancellationToken): Promise<void>;
}
```

### Custom registry provider

`CustomDockerRegistryProvider`:
```typescript
/**
 * Interface for a custom registry provider that implements `getChildTreeItems`, to provide an arbitrary tree of nodes
 */
export interface CustomDockerRegistryProvider extends DockerRegistryProviderBase, ParentTreeItem {
    // @inheritdoc
    getChildTreeItems(token: CancellationToken): Promise<RegistryTreeItem[]>;
}
```

`ParentTreeItem`:
```typescript
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
```

### Others

`DockerCredentials`:
```typescript
/**
 * Interface for Docker credentials, used for `docker login` commands and authenticating to registries.
 */
export interface DockerCredentials {
    /**
     * The service the credentials are for
     */
    readonly service: string;

    /**
     * The username / account name
     */
    readonly account: string;

    /**
     * The secret (password, personal access token, etc.)
     */
    readonly secret: string;
}
```
