/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { FileType, ShellQuotedString } from 'vscode';
import { CommandResponse } from "./CommandRunner";

export type ContainerOS = "linux" | "windows";

export function isContainerOS(maybeContainerOS: unknown): maybeContainerOS is ContainerOS {
    switch (maybeContainerOS) {
        case 'linux':
            return true;
        case 'windows':
            return true;
        default:
            return false;
    }
}

export type Labels = {
    [key: string]: string;
};

export type LabelFilters = {
    [key: string]: string | boolean;
};

// Client Identity Types

// Uniquely identifies a container client
export type ClientIdentity = {
    readonly id: string;
    readonly displayName: string;
    readonly description: string;
    readonly commandName: string;
};

// Version Command Types

export type VersionCommandOptions = {
    // Intentionally empty for now
};

export type VersionItem = {
    client: string;
    server?: string;
};

type VersionCommand = {
    /**
     * Generate a CommandResponse to retrieve runtime version information.
     * @param options Command options
     */
    version(options?: VersionCommandOptions): Promise<CommandResponse<VersionItem>>;
};

// Info CommandTypes

export type InfoCommandOptions = {
    // Intentionally empty for now
};

export type InfoItem = {
    /**
     * The operating system for the container runtime (e.g. Docker Desktop)
     */
    operatingSystem?: string;
    /**
     * The OS type for the container runtime
     */
    osType?: ContainerOS;
    /**
     * The raw JSON from the info record
     */
    raw: string;
};

type InfoCommand = {
    /**
     * Generate a CommandResponse to retrieve runtime information
     * @param options Command options
     */
    info(options?: InfoCommandOptions): Promise<CommandResponse<InfoItem>>;
};

// #region Login/Logout commands

// Login Command Types

/**
 * Standardized options for login
 */
export type LoginCommandOptions = {
    /**
     * The username to log in with.
     */
    username: string;
    /**
     * The `--password-stdin` flag will always be used. This value must be set to `true`; any other value will be ignored.
     * The command runner is responsible for piping the password to the stdin stream.
     */
    passwordStdIn: true;
    /**
     * (Optional) The registry to log in to
     */
    registry?: string;
};

type LoginCommand = {
    /**
     * Log in to a Docker registry
     * @param options Command options
     */
    login(options: LoginCommandOptions): Promise<CommandResponse<void>>;
};

// Logout Command Types

/**
 * Standardized options for logout
 */
export type LogoutCommandOptions = {
    /**
     * (Optional) The registry to log out from
     */
    registry?: string;
};

type LogoutCommand = {
    /**
     * Log out from a Docker registry
     * @param options Command options
     */
    logout(options: LogoutCommandOptions): Promise<CommandResponse<void>>;
};

// #endregion

// #region Image Commands

// Build Image Command Types

/**
 * Standard options for all supported runtimes when building an image
 */
export type BuildImageCommandOptions = {
    /**
     * The path to use for the build image context
     */
    path: string;
    /**
     * Optionally specify a specific Dockerfile to build
     */
    file?: string;
    /**
     * Optionally specify a stage to build (defaults to all stages)
     */
    stage?: string;
    /**
     * Optional tags for the built image (defaults to latest)
     */
    tags?: Array<string> | string;
    /**
     * Should base images always be pulled even if they're already present?
     */
    pull?: boolean;
    /**
     * Explicitly disable or enable the optional content trust feature
     */
    disableContentTrust?: boolean;
    /**
     * Optional labels for the built image
     */
    labels?: Labels;
    /**
     * Optional arguments that can be used to override Dockerfile behavior
     */
    args?: Record<string, string>;
    /**
     * Optional file to write the ID of the built image to
     */
    imageIdFile?: string;
    /**
     * Additional custom options to pass
     */
    customOptions?: string;
};

type BuildImageCommand = {
    /**
     * Generate a CommandResponse for building a container image.
     * @param options Command options
     */
    buildImage(options: BuildImageCommandOptions): Promise<CommandResponse<void>>;
};

// List Images Command Types

/**
 * Standardized options for list images commands
 */
export type ListImagesCommandOptions = {
    /**
     * List all images?
     */
    all?: boolean;
    /**
     * List dangling images?
     */
    dangling?: boolean;
    /**
     * Any labels to filter on when listing images
     */
    labels?: LabelFilters;
    /**
     * Listed images must reference the given base image(s)
     */
    references?: Array<string>;
};

export type ListImagesItem = {
    /**
     * The ID of the image
     */
    id: string;
    /**
     * The name of the image (unless this is an anonymous base image)
     */
    name?: string;
    /**
     * Labels on the image
     */
    labels: Labels;
    /**
     * The tag of the image (unless this is an anonymous base image)
     */
    tag?: string;
    /**
     * The full image name (registry/name:tag)
     */
    image: string;
    /**
     * The date the image was created
     */
    createdAt: Date;
    /**
     * The registry the image belongs to
     */
    registry?: string;
    /**
     * The size (in bytes) of the image
     */
    size?: number;
};

type ListImagesCommand = {
    /**
     * Generate a CommandResponse for listing images
     * @param options Command options
     */
    listImages(options: ListImagesCommandOptions): Promise<CommandResponse<Array<ListImagesItem>>>;
};

// Remove Images Command Types

export type RemoveImagesCommandOptions = {
    /**
     * Images to remove
     */
    images: Array<string>;
    /**
     * Force remove images even if there are running containers
     */
    force?: boolean;
};

type RemoveImagesCommand = {
    /**
     * Generate a CommandResponse for removing image(s).
     * @param options Command options
     */
    removeImages(options: RemoveImagesCommandOptions): Promise<CommandResponse<Array<string>>>;
};

// Prune Images Command Types

/**
 * Standardized options for prune image commands
 */
export type PruneImagesCommandOptions = {
    /**
     * Prune all images?
     */
    all?: boolean;
};

/**
 * Results from pruning images
 */
export type PruneImagesItem = {
    /**
     * A list of the images deleted
     */
    imagesDeleted?: string[];

    /**
     * The amount of space (in bytes) reclaimed
     */
    spaceReclaimed?: number;
};

type PruneImagesCommand = {
    /**
     * Generate a CommandResponse for pruning images
     * @param options Command options
     */
    pruneImages(options: PruneImagesCommandOptions): Promise<CommandResponse<PruneImagesItem>>;
};

// Pull Image Command Types

/**
 * Standardized options for pull image commands
 */
export type PullImageCommandOptions = {
    /**
     * The specific image to pull (registry/name:tag format)
     */
    image: string;
    /**
     * Should all tags for the given image be pulled or just the given tag?
     */
    allTags?: boolean;
    /**
     * Disable or enable optional content trust settings for the remote repo
     */
    disableContentTrust?: boolean;
};

type PullImageCommand = {
    /**
     * Generate a CommandResponse for pulling an image.
     * @param options Command options
     */
    pullImage(options: PullImageCommandOptions): Promise<CommandResponse<void>>;
};

// Push Image Command Types

/**
 * Standardized options for push image commands
 */
export type PushImageCommandOptions = {
    /**
     * The specific image to push (registry/name:tag format)
     */
    image: string;
};

type PushImageCommand = {
    /**
     * Generate a CommandResponse for pushing an image.
     * @param options Command options
     */
    pushImage(options: PushImageCommandOptions): Promise<CommandResponse<void>>;
};

// Tag Image Command Types

export type TagImageCommandOptions = {
    /**
     * The base image to add an additional tag to
     */
    fromImage: string;
    /**
     * The new image with tag for the existing image
     */
    toImage: string;
};

type TagImageCommand = {
    /**
     * Generate a CommandResponse for adding an additional tag to an existing
     * image.
     * @param options Command options
     */
    tagImage(options: TagImageCommandOptions): Promise<CommandResponse<void>>;
};

// Inspect Image Command Types

export type InspectImagesItem = {
    /**
     * The image ID
     */
    id: string;
    /**
     * The image name, e.g. 'alpine'
     */
    name?: string;
    /**
     * The image tag, e.g. 'latest'
     */
    tag?: string;
    /**
     * The registry the image belongs to, e.g. 'docker.io/library'
     */
    registry?: string;
    /**
     * The full name of the image (registry/name:tag), e.g. 'docker.io/library/alpine:latest'
     */
    image?: string;
    /**
     * Repo digest values
     */
    repoDigests: string[];
    /**
     * Is the image local only?
     */
    isLocalImage: boolean;
    /**
     * Any environment variables associated with the image
     */
    environmentVariables: Record<string, string>;
    /**
     * Any default ports exposed by the image
     */
    ports: Array<PortBinding>;
    /**
     * Any volumes defined by the image
     */
    volumes: Array<string>;
    /**
     * Any labels assigned to the image
     */
    labels: Record<string, string>;
    /**
     * The entrypoint for running the image in a container
     */
    entrypoint: Array<string>;
    /**
     * The command used to start the image in a container
     */
    command: Array<string>;
    /**
     * The default working directory in the image
     */
    currentDirectory?: string;
    /**
     * The image architecture
     */
    architecture?: "amd64" | "arm64";
    /**
     * The image operating system
     */
    operatingSystem?: ContainerOS;
    /**
     * The date the image was created
     */
    createdAt: Date;
    /**
     * The default user in the container
     */
    user?: string;
    /**
     * The RAW inspect output
     */
    raw: string;
};

/**
 * Options for inspecting images
 */
export type InspectImagesCommandOptions = {
    /**
     * The images to inspect
     */
    images: Array<string>;
};

type InspectImagesCommand = {
    /**
     * Generate a CommandResponse for inspecting images
     * @param options Command options
     */
    inspectImages(options: InspectImagesCommandOptions): Promise<CommandResponse<Array<InspectImagesItem>>>;
};

//#endregion

//#region Container commands

// Run Container Command Types

export type PortBinding = {
    /**
     * The internal container port
     */
    containerPort: number;
    /**
     * The optional host port to bind to the container port
     */
    hostPort?: number;
    /**
     * The optional host IP to bind the port on
     */
    hostIp?: string;
    /**
     * The protocol the port uses
     */
    protocol?: 'udp' | 'tcp';
};

export type RunContainerBindMount = {
    type: 'bind';
    source: string;
    destination: string;
    readOnly: boolean;
    // relable?: boolean; // TODO: not possible with mount syntax
};

export type RunContainerVolumeMount = {
    type: 'volume';
    source: string;
    destination: string;
    readOnly: boolean;
};

export type RunContainerMount =
    | RunContainerBindMount
    | RunContainerVolumeMount;

export type RunContainerExtraHost = {
    hostname: string;
    ip: string;
};

export type RunContainerCommandOptions = {
    /**
     * The image to run
     */
    image: string;
    /**
     * Optional name to give the new container
     */
    name?: string;
    /**
     * Should the container be run detached?
     */
    detached?: boolean;
    /**
     * Should the container be run interactive?
     */
    interactive?: boolean;
    /**
     * Should the container be removed when it exits?
     */
    removeOnExit?: boolean;
    /**
     * Optional labels to assign to the container
     */
    labels?: Labels;
    /**
     * Optional ports to expose for the container
     */
    ports?: Array<PortBinding>;
    /**
     * Should all exposed ports get automatic host bindings?
     */
    publishAllPorts?: boolean;
    /**
     * A network to connect to the container
     */
    network?: string;
    /**
     * A network-scoped alias for the container
     */
    networkAlias?: string;
    /**
     * Extra host-to-IP mappings
     */
    addHost?: Array<RunContainerExtraHost>;
    /**
     * Mounts to attach to the container
     */
    mounts?: Array<RunContainerMount>;
    /**
     * Environment variables to set for the container
     */
    environmentVariables?: Record<string, string>;
    /**
     * Environment files for the container
     */
    environmentFiles?: string[];
    /**
     * Rule for pulling base images
     */
    pull?: "always" | "missing" | "never";
    /**
     * Optional entrypoint for running the container
     */
    entrypoint?: string;
    /**
     * Optional command to use in starting the container
     */
    command?: Array<string> | string;
    /**
     * Additional custom options to pass
     */
    customOptions?: string;
};

type RunContainerCommand = {
    /**
     * Generate a CommandResponse for running a container.
     * @param options Command options
     */
    runContainer(options: RunContainerCommandOptions): Promise<CommandResponse<string | undefined>>;
};

// Exec Container Command Types

export type ExecContainerCommandOptions = {
    /**
     * The container to execute a command in
     */
    container: string;
    /**
     * Should the command be run interactive?
     */
    interactive?: boolean;
    /**
     * Should the command be run detached?
     */
    detached?: boolean;
    /**
     * Should a tty terminal be associated with the execution?
     */
    tty?: boolean;
    /**
     * Environment variables to set for the command
     */
    environmentVariables?: Record<string, string>;
    /**
     * The command to run in the container
     */
    command: Array<string | ShellQuotedString> | string | ShellQuotedString;
};

type ExecContainerCommand = {
    /**
     * Generate a CommandResponse for executing a command in a running container.
     * @param options Command options
     */
    execContainer(options: ExecContainerCommandOptions): Promise<CommandResponse<string>>;
};

// List Containers Command Types

export type ListContainersCommandOptions = {
    /**
     * Should all containers be listed?
     */
    all?: boolean;
    /**
     * Should only running containers be listed?
     */
    running?: boolean;
    /**
     * Should exited containers be listed?
     */
    exited?: boolean;
    /**
     * Only list containers with matching labels
     */
    labels?: LabelFilters;
    /**
     * Only list containers with matching names
     */
    names?: Array<string>;
    /**
     * Only list containers with matching image full IDs as ancestors
     */
    imageAncestors?: Array<string>;
    /**
     * Only list containers using matching volumes
     */
    volumes?: Array<string>;
    /**
     * Only list containers using matching networks
     */
    networks?: Array<string>;
};

export type ListContainersItem = {
    /**
     * The ID of the container
     */
    id: string;
    /**
     * The name of the container
     */
    name: string;
    /**
     * Labels on the container
     */
    labels: Labels;
    /**
     * The image name used to run the container (e.g. 'alpine')
     */
    image: string;
    /**
     * The exposed ports for the container
     */
    ports: Array<PortBinding>;
    /**
     * The list of connected networks for the container
     */
    networks: string[];
    /**
     * The date the container was created
     */
    createdAt: Date;
    /**
     * The container state (e.g. 'running', 'stopped', 'paused', etc.)
     */
    state: string;
    /**
     * The container status (e.g. 'Up 5 minutes', 'Exited (0) 1 minute ago', etc.)
     */
    status?: string;
};

type ListContainersCommand = {
    /**
     * Generate a CommandResponse for listing containers.
     * @param options Command options
     */
    listContainers(options: ListContainersCommandOptions): Promise<CommandResponse<Array<ListContainersItem>>>;
};

// Stop Containers Command Types

export type StopContainersCommandOptions = {
    /**
     * Containers to stop
     */
    container: Array<string>;
    /**
     * Time to wait for graceful exit before halting the container
     */
    time?: number;
};

type StopContainersCommand = {
    /**
     * Generate a CommandResponse for stopping container(s).
     * @param options Command options
     */
    stopContainers(options: StopContainersCommandOptions): Promise<CommandResponse<Array<string>>>;
};

// Start Containers Command Types

export type StartContainersCommandOptions = {
    /**
     * Containers to start
     */
    container: Array<string>;
};

type StartContainersCommand = {
    /**
     * Generate a CommandResponse for starting container(s).
     * @param options Command options
     */
    startContainers(options: StartContainersCommandOptions): Promise<CommandResponse<Array<string>>>;
};

// Restart Containers Command Types

export type RestartContainersCommandOptions = {
    /**
     * Containers to restart
     */
    container: Array<string>;
};

type RestartContainersCommand = {
    /**
     * Generate a CommandResponse for restarting container(s).
     * @param options Command options
     */
    restartContainers(options: RestartContainersCommandOptions): Promise<CommandResponse<Array<string>>>;
};

// Remove Containers Command Types

export type RemoveContainersCommandOptions = {
    /**
     * Containers to remove
     */
    containers: Array<string>;
    /**
     * Force remove containers even if they aren't stopped?
     */
    force?: boolean;
};

type RemoveContainersCommand = {
    /**
     * Generate a CommandResponse for removing container(s).
     * @param options Command options
     */
    removeContainers(options: RemoveContainersCommandOptions): Promise<CommandResponse<Array<string>>>;
};

// Prune Containers Command Types

export type PruneContainersCommandOptions = {
    // Intentionally empty for now
};

/**
 * Results from pruning containers
 */
export type PruneContainersItem = {
    /**
     * A list of the containers deleted
     */
    containersDeleted?: string[];

    /**
     * The amount of space (in bytes) reclaimed
     */
    spaceReclaimed?: number;
};

type PruneContainersCommand = {
    pruneContainers(options: PruneContainersCommandOptions): Promise<CommandResponse<PruneContainersItem>>
};

// Logs For Container Command Types

export type LogsForContainerCommandOptions = {
    /**
     * Container to return logs from
     */
    container: string;
    /**
     * Return the logs in follow mode (new entries are streamed as added) vs.
     * just returning the current logs at the time the command was run
     */
    follow?: boolean;
    /**
     * Optionally start returning log entries a given number of lines from the end
     */
    tail?: number;
    /**
     * Only return log entries since a given timestamp
     */
    since?: string;
    /**
     * Only return log entries before a given timestamp
     */
    until?: string;
    /**
     * Include timestamps for each returned log entry
     */
    timestamps?: boolean;
};

type LogsForContainerCommand = {
    /**
     * Generate a CommandResponse for retrieving container logs
     * @param options Command options
     */
    logsForContainer(options: LogsForContainerCommandOptions): Promise<CommandResponse<void>>;
};

// Inspect Container Command Types

/**
 * Options for inspecting containers
 */
export type InspectContainersCommandOptions = {
    /**
     * Containers to inspect
     */
    containers: Array<string>;
};

export type InspectContainersItemBindMount = {
    type: 'bind';
    /**
     * The source of the bind mount (path on host)
     */
    source: string;
    /**
     * The destination for the bind mount (path in container)
     */
    destination: string;
    /**
     * Is the mount read only?
     */
    readOnly: boolean;
};

export type InspectContainersItemVolumeMount = {
    type: 'volume';
    /**
     * The source of the volume mount (volume name)
     */
    source: string;
    /**
     * The destination for the volume mount (path in container)
     */
    destination: string;
    /**
     * The volume driver used
     */
    driver?: string;
    /**
     * Is the volume read only?
     */
    readOnly: boolean;
};

export type InspectContainersItemMount =
    | InspectContainersItemBindMount
    | InspectContainersItemVolumeMount;

export type InspectContainersItemNetwork = {
    /**
     * The name of the network
     */
    name: string;
    /**
     * The network gateway address
     */
    gateway?: string;
    /**
     * The root IP address of the network
     */
    ipAddress?: string;
    /**
     * The MAC address associated with the network
     */
    macAddress?: string;
};

export type InspectContainersItem = {
    /**
     * The ID of the container
     */
    id: string;
    /**
     * The name of the container
     */
    name: string;
    /**
     * The ID of the image used to run the container
     */
    imageId: string;
    /**
     * The name of the image used to run the container
     */
    imageName: string;
    /**
     * The status of the container
     */
    status?: string;
    /**
     * Environment variables set when running the container
     */
    environmentVariables: Record<string, string>;
    /**
     * Networks attachd to the container
     */
    networks: Array<InspectContainersItemNetwork>;
    /**
     * IP Address assigned to the container
     */
    ipAddress?: string;
    /**
     * The container operating system
     */
    operatingSystem?: ContainerOS;
    /**
     * Ports exposed for the container
     */
    ports: Array<PortBinding>;
    /**
     * Mounts attached to the container
     */
    mounts: Array<InspectContainersItemMount>;
    /**
     * Labels assigned to the container
     */
    labels: Record<string, string>;
    /**
     * The entrypoint used to start the container
     */
    entrypoint: Array<string>;
    /**
     * The command used to run the container
     */
    command: Array<string>;
    /**
     * The default working directory in the container
     */
    currentDirectory?: string;
    /**
     * The date the container was created
     */
    createdAt: Date;
    /**
     * The date the container was started
     */
    startedAt?: Date;
    /**
     * The date the container stopped
     */
    finishedAt?: Date;
    /**
     * The raw JSON from the inspect record
     */
    raw: string;
};

type InspectContainersCommand = {
    /**
     * Generate a CommandResponse for inspecting containers.
     * @param options Command options
     */
    inspectContainers(options: InspectContainersCommandOptions): Promise<CommandResponse<Array<InspectContainersItem>>>;
};

// Stats command types

/**
 * Options for container stats
 */
export type ContainersStatsCommandOptions = {
    all?: boolean;
};

type ContainersStatsCommand = {
    /**
     * Show running container stats
     * @param options Command options
     */
    statsContainers(options: ContainersStatsCommandOptions): Promise<CommandResponse<string>>;
};

// #endregion

// #region Volume commands

// Create Volume Command Types

export type CreateVolumeCommandOptions = {
    /**
     * The name for the volume
     */
    name: string;
    /**
     * Optional driver to use for the volume
     */
    driver?: string;
};

type CreateVolumeCommand = {
    /**
     * Generate a CommandResponse for creating a volume
     * @param options Command options
     */
    createVolume(options: CreateVolumeCommandOptions): Promise<CommandResponse<void>>;
};

// List Volumes Command Types

export type ListVolumesCommandOptions = {
    /**
     * Only list volumes that match the given labels
     */
    labels?: LabelFilters;
    /**
     * Include dangling volumes?
     */
    dangling?: boolean;
    /**
     * Only list volumes with a given driver
     */
    driver?: string;
};

export type ListVolumeItem = {
    /**
     * The name of the volume
     */
    name: string;
    /**
     * The volume driver
     */
    driver: string;
    /**
     * Labels assigned to the volume
     */
    labels: Labels;
    /**
     * The mount point for the volume
     */
    mountpoint: string;
    /**
     * The scope for the volume
     */
    scope: string;
    /**
     * The date the volume was created at
     */
    createdAt?: Date;
    /**
     * The size (in bytes) of the volume
     */
    size?: number;
};

type ListVolumesCommand = {
    /**
     * Generate a CommandResponse for listing volumes
     * @param options Command options
     */
    listVolumes(options: ListVolumesCommandOptions): Promise<CommandResponse<Array<ListVolumeItem>>>;
};

// Remove Volumes Command Types

export type RemoveVolumesCommandOptions = {
    /**
     * Volumes to remove
     */
    volumes: Array<string>;
    /**
     * Force removing volumes even if they're attached to a container?
     */
    force?: boolean;
};

type RemoveVolumesCommand = {
    /**
     * Generate a CommandResponse for removing volumes
     * @param options Command options
     */
    removeVolumes(options: RemoveVolumesCommandOptions): Promise<CommandResponse<Array<string>>>;
};

// Prune Volumes Command Types

/**
 * Standardized options for prune volume commands
 */
export type PruneVolumesCommandOptions = {
    // Intentionally empty for now
};

/**
 * Results from pruning volumes
 */
export type PruneVolumesItem = {
    /**
     * A list of the volumes deleted
     */
    volumesDeleted?: string[];

    /**
     * The amount of space (in bytes) reclaimed
     */
    spaceReclaimed?: number;
};

type PruneVolumesCommand = {
    /**
     * Generate a CommandResponse for pruning volumes
     * @param options Command options
     */
    pruneVolumes(options: PruneVolumesCommandOptions): Promise<CommandResponse<PruneVolumesItem>>;
};

// Inspect Volumes Command Types

/**
 * Options for inspecting volumes
 */
export type InspectVolumesCommandOptions = {
    /**
     * Volumes to inspect
     */
    volumes: Array<string>;
};

export type InspectVolumesItem = {
    /**
     * The name of the volume
     */
    name: string;
    /**
     * The driver for the volume
     */
    driver: string;
    /**
     * The mount point for the volume
     */
    mountpoint: string;
    /**
     * The scope for the volume
     */
    scope: string;
    /**
     * Labels assigned to the volume
     */
    labels: Record<string, string>;
    /**
     * Driver-specific options for the volume
     */
    options: Record<string, unknown>;
    /**
     * The date the volume was created
     */
    createdAt: Date;
    /**
     * The raw JSON from the inspect record
     */
    raw: string;
};

type InspectVolumesCommand = {
    /**
     * Generate a CommandResponse for inspecting volumes.
     * @param options Command options
     */
    inspectVolumes(options: InspectVolumesCommandOptions): Promise<CommandResponse<Array<InspectVolumesItem>>>;
};

// #endregion

// #region Network commands

// Create Network Command Types

export type CreateNetworkCommandOptions = {
    /**
     * The name for the network
     */
    name: string;
    /**
     * Optional driver to use for the network
     */
    driver?: string;
};

type CreateNetworkCommand = {
    /**
     * Generate a CommandResponse for creating a network
     * @param options Command options
     */
    createNetwork(options: CreateNetworkCommandOptions): Promise<CommandResponse<void>>;
};

// List Networks Command Types

export type ListNetworksCommandOptions = {
    /**
     * Only list networks that match the given labels
     */
    labels?: LabelFilters;
    /**
     * Only list networks with a given driver
     */
    driver?: string;
};

export type ListNetworkItem = {
    /**
     * The name of the network
     */
    name: string;
    /**
     * The ID of the network
     */
    id: string;
    /**
     * The network driver
     */
    driver: string;
    /**
     * Labels assigned to the network
     */
    labels: Labels;
    /**
     * The network scope
     */
    scope: string;
    /**
     * True if IPv6 network
     */
    ipv6: boolean;
    /**
     * The date the network was created
     */
    createdAt: Date;
    /**
     * True if internal network
     */
    internal: boolean;
};

type ListNetworksCommand = {
    /**
     * Generate a CommandResponse for listing networks
     * @param options Command options
     */
    listNetworks(options: ListNetworksCommandOptions): Promise<CommandResponse<Array<ListNetworkItem>>>;
};

// Remove Networks Command Types

export type RemoveNetworksCommandOptions = {
    /**
     * Networks to remove
     */
    networks: Array<string>;
    /**
     * Force removing networks even if they're attached to a container?
     */
    force?: boolean;
};

type RemoveNetworksCommand = {
    /**
     * Generate a CommandResponse for removing networks
     * @param options Command options
     */
    removeNetworks(options: RemoveNetworksCommandOptions): Promise<CommandResponse<Array<string>>>;
};

// Prune Networks Command Types

/**
 * Standardized options for prune network commands
 */
export type PruneNetworksCommandOptions = {
    // Intentionally empty for now
};

/**
 * Results from pruning networks
 */
export type PruneNetworksItem = {
    /**
     * A list of the networks deleted
     */
    networksDeleted?: string[];
};

type PruneNetworksCommand = {
    /**
     * Generate a CommandResponse for pruning networks
     * @param options Command options
     */
    pruneNetworks(options: PruneNetworksCommandOptions): Promise<CommandResponse<PruneNetworksItem>>;
};

// Inspect Networks Command Types

/**
 * Options for inspecting networks
 */
export type InspectNetworksCommandOptions = {
    /**
     * Networks to inspect
     */
    networks: Array<string>;
};

export type NetworkIpamConfig = {
    driver: string;
    config: {
        subnet: string;
        gateway: string;
    }[];
};

export type InspectNetworksItem = {
    /**
     * The name of the network
     */
    name: string;
    /**
     * The ID of the network
     */
    id: string;
    /**
     * The network driver
     */
    driver: string;
    /**
     * Labels assigned to the network
     */
    labels: Labels;
    /**
     * The network scope
     */
    scope: string;
    /**
     * The IPAM config
     */
    ipam: NetworkIpamConfig;
    /**
     * True if IPv6 network
     */
    ipv6: boolean;
    /**
     * True if internal network
     */
    internal: boolean;
    /**
     * True if attachable
     */
    attachable: boolean;
    /**
     * True if ingress
     */
    ingress: boolean;
    /**
     * The date the network was created
     */
    createdAt: Date;
    /**
     * The raw JSON from the inspect record
     */
    raw: string;
};

type InspectNetworksCommand = {
    /**
     * Generate a CommandResponse for inspecting networks.
     * @param options Command options
     */
    inspectNetworks(options: InspectNetworksCommandOptions): Promise<CommandResponse<Array<InspectNetworksItem>>>;
};

// #endregion

// #region Context commands

/**
 * The type for a context. For local contexts it will be 'containerd'; for cloud contexts 'aci', 'ecs', etc.
 */
export type ContextType = 'aci' | 'containerd' | 'ecs' | string;

// List Contexts Command Types

export type ListContextsCommandOptions = {
    // Intentionally empty for now
};

export type ListContextItem = {
    /**
     * The name of the context
     */
    name: string;
    /**
     * The description of the context
     */
    description?: string;
    /**
     * Whether or not the context is currently selected
     */
    current: boolean;
    /**
     * The context type
     */
    type?: ContextType;
    /**
     * The endpoint used for the container daemon
     */
    containerEndpoint?: string;
};

type ListContextsCommand = {
    /**
     * Generate a CommandResponse for listing contexts
     * @param options Command options
     */
    listContexts(options: ListContextsCommandOptions): Promise<CommandResponse<Array<ListContextItem>>>;
};

// Remove Contexts Command Types

export type RemoveContextsCommandOptions = {
    /**
     * Contexts to remove
     */
    contexts: Array<string>;
};

type RemoveContextsCommand = {
    /**
     * Generate a CommandResponse for removing contexts
     * @param options Command options
     */
    removeContexts(options: RemoveContextsCommandOptions): Promise<CommandResponse<Array<string>>>;
};

// Use Context Command Types

export type UseContextCommandOptions = {
    /**
     * Context to use
     */
    context: string;
};

type UseContextCommand = {
    /**
     * Generate a CommandResponse for using a context
     * @param options Command options
     */
    useContext(options: UseContextCommandOptions): Promise<CommandResponse<void>>;
};

// Inspect Contexts Command Types

/**
 * Options for inspecting contexts
 */
export type InspectContextsCommandOptions = {
    /**
     * Contexts to inspect
     */
    contexts: Array<string>;
};

export type InspectContextsItem = {
    /**
     * The name of the context
     */
    name: string;
    /**
     * The description of the context
     */
    description?: string;
    /**
     * The context type
     */
    type?: ContextType;
    // More properties exist but are highly dependent on container runtime
    /**
     * The raw JSON from the inspect record
     */
    raw: string;
};

type InspectContextsCommand = {
    /**
     * Generate a CommandResponse for inspecting contexts.
     * @param options Command options
     */
    inspectContexts(options: InspectContextsCommandOptions): Promise<CommandResponse<Array<InspectContextsItem>>>;
};

// #endregion

// #region Container filesystem commands

// List files command types

export type ListFilesCommandOptions = {
    /**
    * The container to execute a command in
    */
    container: string;
    /**
     * The absolute path of a directory in the container to list the contents of
     */
    path: string;
    /**
     * The container operating system. If not supplied, 'linux' will be assumed.
     */
    operatingSystem?: ContainerOS;
};

export type ListFilesItem = {
    /**
     * The name of the file/directory
     */
    name: string;
    /**
     * The absolute path of the file/directory within the container
     */
    path: string;
    /**
     * The creation time of the file/directory, in milliseconds since Unix epoch
     */
    ctime: number;
    /**
     * The modification time of the file/directory, in milliseconds since Unix epoch
     */
    mtime: number;
    /**
     * The size of the file (0 if a directory), in bytes
     */
    size: number;
    /**
     * The type of the file item (file/directory)
     */
    type: FileType;
};

type ListFilesCommand = {
    /**
     * Lists the contents of a given path in a container
     * @param options Command options
     */
    listFiles(options: ListFilesCommandOptions): Promise<CommandResponse<Array<ListFilesItem>>>;
};

// Read file command types

export type ReadFileCommandOptions = {
    /**
    * The container to execute a command in
    */
    container: string;
    /**
     * The absolute path of the file in the container to read
     */
    path: string;
    /**
     * (Optional) The path on the host to write the container file to. If not given, it is
     * necessary to handle contents from stdout in the command runner.
     */
    outputFile?: string;
    /**
     * The container operating system. If not supplied, 'linux' will be assumed.
     */
    operatingSystem?: ContainerOS;
};

type ReadFileCommand = {
    /**
     * Read a file inside the container. Start a process with the {@link CommandResponse}
     * and read from its stdout stream (or use {@link ShellCommandRunnerFactory} to accumulate
     * the output into a string and return it from `parse`).
     * NOTE: the output stream is in tarball format with Linux containers, and cleartext with Windows containers.
     * @param options Command options
     */
    readFile(options: ReadFileCommandOptions): Promise<CommandResponse<void>>;
};

// Write file command types

export type WriteFileCommandOptions = {
    /**
    * The container to execute a command in
    */
    container: string;
    /**
     * The absolute path of the **directory** in the container to write files into
     */
    path: string;
    /**
     * (Optional) The file or directory on the host to copy into the container. If not given, it is necessary
     * to write the file contents to stdin in the command runner.
     */
    inputFile?: string;
    /**
     * The container operating system. If not supplied, 'linux' will be assumed.
     */
    operatingSystem?: ContainerOS;
};

type WriteFileCommand = {
    /**
     * Write a file inside the container. Start a process with the {@link CommandResponse}
     * and write to its stdin stream.
     * NOTE: the input stream must be in tarball format.
     * NOTE: this command is not supported on Windows containers.
     * @param options Command options
     */
    writeFile(options: WriteFileCommandOptions): Promise<CommandResponse<void>>;
};

// #endregion

/**
 * Standard interface for executing commands against container runtimes.
 * Individual runtimes implement this interface.
 */
export interface IContainersClient extends
    ClientIdentity,
    VersionCommand,
    InfoCommand,
    LoginCommand,
    LogoutCommand,
    // Image Commands
    BuildImageCommand,
    ListImagesCommand,
    RemoveImagesCommand,
    PruneImagesCommand,
    PullImageCommand,
    TagImageCommand,
    InspectImagesCommand,
    PushImageCommand,
    // Container Commands
    RunContainerCommand,
    ExecContainerCommand,
    ListContainersCommand,
    StartContainersCommand,
    RestartContainersCommand,
    StopContainersCommand,
    RemoveContainersCommand,
    PruneContainersCommand,
    LogsForContainerCommand,
    InspectContainersCommand,
    ContainersStatsCommand,
    // Volume Commands
    CreateVolumeCommand,
    ListVolumesCommand,
    RemoveVolumesCommand,
    PruneVolumesCommand,
    InspectVolumesCommand,
    // Network Commands
    CreateNetworkCommand,
    ListNetworksCommand,
    RemoveNetworksCommand,
    PruneNetworksCommand,
    InspectNetworksCommand,
    // Context commands
    ListContextsCommand,
    RemoveContextsCommand,
    UseContextCommand,
    InspectContextsCommand,
    // Filesystem commands
    ListFilesCommand,
    ReadFileCommand,
    WriteFileCommand { }
