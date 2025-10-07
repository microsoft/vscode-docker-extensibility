/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FileType, type ShellQuotedString } from 'vscode';
import { GeneratorCommandResponse, PromiseCommandResponse, VoidCommandResponse } from './CommandRunner';
import { ContainerOS, ContainerOSSchema, EventAction, EventActionSchema, EventType, EventTypeSchema } from './ZodEnums';
import z from 'zod/v3';

// Reexport the nativized Zod enums, but not their Zod schemas
export { ContainerOS, EventAction, EventType } from './ZodEnums';

export const ImageNameInfoSchema = z.object({
    originalName: z.string().optional().describe('The original name as returned by the CLI'),
    image: z.string().optional().describe('The name of the image. For example, in "docker.io/library/alpine:latest", this will be "library/alpine".'),
    registry: z.string().optional().describe('The name of the registry. If absent from the original name, this will be undefined.'),
    tag: z.string().optional().describe('The tag/anchor name. If absent, this will be undefined.'),
    digest: z.string().optional().describe('The digest. If absent, this will be undefined.'),
});

export type ImageNameInfo = z.infer<typeof ImageNameInfoSchema>;

export type Labels = Record<string, string>;

export type LabelFilters = Record<string, string | boolean>;

// Client Identity Types

// Uniquely identifies a container client
export type ClientIdentity = {
    /**
     * The client ID. Must be unique.
     */
    readonly id: string;
    /**
     * A human-readable display name for the client. Will have a default value,
     * but can be changed by the consumer (e.g. for localization).
     */
    displayName: string;
    /**
     * A human-readable description for the client. Will have a default value,
     * but can be changed by the consumer (e.g. for localization).
     */
    description: string;
    /**
     * The default command name / path to use for the client. Will have a
     * default value, but can be changed by the consumer (e.g. for
     * custom install paths).
     */
    commandName: string;
};

export type ImageNameDefaults = {
    /**
     * The default registry used by the client for pulling public images
     */
    readonly defaultRegistry: string;
    /**
     * The default tag used by the client for pulling public images
     */
    readonly defaultTag: string;
};

export type CommonCommandOptions = Record<string, unknown>;

// Version Command Types

export type VersionCommandOptions = CommonCommandOptions & {
    // Intentionally empty for now
};

export const VersionItemSchema = z.object({
    client: z.string(),
    server: z.string().optional(),
});

export type VersionItem = z.infer<typeof VersionItemSchema>;


type VersionCommand = {
    /**
     * Generate a CommandResponse to retrieve runtime version information.
     * @param options Command options
     */
    version(options: VersionCommandOptions): Promise<PromiseCommandResponse<VersionItem>>;
};

// CheckInstall Command Types

export type CheckInstallCommandOptions = CommonCommandOptions & {
    // Intentionally empty for now
};

export const CheckInstallResultSchema = z.string();

export type CheckInstallResult = z.infer<typeof CheckInstallResultSchema>;

type CheckInstallCommand = {
    /**
     * Generate a CommandResponse to check if the runtime is installed. The
     * command will return a non-zero exit code if the runtime is not installed.
     * @param options Command options
     */
    checkInstall(options: CheckInstallCommandOptions): Promise<PromiseCommandResponse<CheckInstallResult>>;
};

// Info Command Types

export type InfoCommandOptions = CommonCommandOptions & {
    // Intentionally empty for now
};

export const InfoItemSchema = z.object({
    operatingSystem: z.string().optional().describe('The operating system for the container runtime (e.g. Docker Desktop)'),
    osType: z.string().optional().describe('The OS type for the container runtime'),
    raw: z.string().describe('The raw JSON from the info record'),
});

export type InfoItem = z.infer<typeof InfoItemSchema>;

type InfoCommand = {
    /**
     * Generate a CommandResponse to retrieve runtime information
     * @param options Command options
     */
    info(options: InfoCommandOptions): Promise<PromiseCommandResponse<InfoItem>>;
};

// Event Stream Command Types

/**
 * Options for the Event Stream command
 */
export type EventStreamCommandOptions = CommonCommandOptions & {
    /**
     * Return events since a given timestamp
     */
    since?: string | number;
    /**
     * Only stream events until a given timestamp
     */
    until?: string | number;
    /**
     * Only listen for events affecting these object types
     */
    types?: EventType[];
    /**
     * Only listen for events with these labels
     */
    labels?: LabelFilters;
    /**
     * Only listen for events of these types
     */
    events?: EventAction[];
};

export const EventItemSchema = z.object({
    type: EventTypeSchema.describe('The event type'),
    action: EventActionSchema.describe('The event action'),
    timestamp: z.date().describe('The timestamp of the event'),
    actor: z.object({
        id: z.string(),
        attributes: z.record(z.string(), z.unknown()),
    }).describe('Details about the affected object'),
    raw: z.string().describe('The RAW event output'),
});

export type EventItem = z.infer<typeof EventItemSchema>;



type GetEventStreamCommand = {
    /**
     * Generate a CommandResponse for an event stream
     * @param options Command options
     */
    getEventStream(options: EventStreamCommandOptions): Promise<GeneratorCommandResponse<EventItem>>;
};

// #region Login/Logout commands

// Login Command Types

/**
 * Standardized options for login
 */
export type LoginCommandOptions = CommonCommandOptions & {
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
    login(options: LoginCommandOptions): Promise<VoidCommandResponse>;
};

// Logout Command Types

/**
 * Standardized options for logout
 */
export type LogoutCommandOptions = CommonCommandOptions & {
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
    logout(options: LogoutCommandOptions): Promise<VoidCommandResponse>;
};

// #endregion

// #region Image Commands

// Build Image Command Types

/**
 * Target platform for the image build
 */
export type ContainerPlatform = {
    /**
     * OS of target platform
     */
    os?: string;
    /**
     * Architecture of target platform
     */
    architecture?: string;
};

/**
 * Standard options for all supported runtimes when building an image
 */
export type BuildImageCommandOptions = CommonCommandOptions & {
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
     * Target platform for the image build
     */
    platform?: ContainerPlatform;
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
    buildImage(options: BuildImageCommandOptions): Promise<VoidCommandResponse>;
};

// List Images Command Types

/**
 * Standardized options for list images commands
 */
export type ListImagesCommandOptions = CommonCommandOptions & {
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

export const ListImagesItemSchema = z.object({
    id: z.string().describe('The ID of the image'),
    image: ImageNameInfoSchema.describe('Image name information'),
    createdAt: z.date().describe('The date the image was created'),
    size: z.number().optional().describe('The size (in bytes) of the image'),
});

export type ListImagesItem = z.infer<typeof ListImagesItemSchema>;

type ListImagesCommand = {
    /**
     * Generate a CommandResponse for listing images
     * @param options Command options
     */
    listImages(options: ListImagesCommandOptions): Promise<PromiseCommandResponse<Array<ListImagesItem>>>;
};

// Remove Images Command Types

export type RemoveImagesCommandOptions = CommonCommandOptions & {
    /**
     * Image names/IDs/etc. to remove, passed directly to the CLI
     */
    imageRefs: Array<string>;
    /**
     * Force remove images even if there are running containers
     */
    force?: boolean;
};

export const RemovedImagesIdsSchema = z.array(z.string());

export type RemovedImagesIds = z.infer<typeof RemovedImagesIdsSchema>;

type RemoveImagesCommand = {
    /**
     * Generate a CommandResponse for removing image(s).
     * @param options Command options
     */
    removeImages(options: RemoveImagesCommandOptions): Promise<PromiseCommandResponse<RemovedImagesIds>>;
};

// Prune Images Command Types

/**
 * Standardized options for prune image commands
 */
export type PruneImagesCommandOptions = CommonCommandOptions & {
    /**
     * Prune all images?
     */
    all?: boolean;
};

export const PruneImagesItemSchema = z.object({
    imageRefsDeleted: z.array(z.string()).optional().describe('A list of the image names/IDs/etc. deleted'),
    spaceReclaimed: z.number().optional().describe('The amount of space (in bytes) reclaimed'),
});

export type PruneImagesItem = z.infer<typeof PruneImagesItemSchema>;

type PruneImagesCommand = {
    /**
     * Generate a CommandResponse for pruning images
     * @param options Command options
     */
    pruneImages(options: PruneImagesCommandOptions): Promise<PromiseCommandResponse<PruneImagesItem>>;
};

// Pull Image Command Types

/**
 * Standardized options for pull image commands
 */
export type PullImageCommandOptions = CommonCommandOptions & {
    /**
     * The specific image to pull (registry/name:tag format), passed directly to CLI
     */
    imageRef: string;
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
    pullImage(options: PullImageCommandOptions): Promise<VoidCommandResponse>;
};

// Push Image Command Types

/**
 * Standardized options for push image commands
 */
export type PushImageCommandOptions = CommonCommandOptions & {
    /**
     * The specific image to push (registry/name:tag format), passed directly to CLI
     */
    imageRef: string;
};

type PushImageCommand = {
    /**
     * Generate a CommandResponse for pushing an image.
     * @param options Command options
     */
    pushImage(options: PushImageCommandOptions): Promise<VoidCommandResponse>;
};

// Tag Image Command Types

export type TagImageCommandOptions = CommonCommandOptions & {
    /**
     * The base image to add an additional tag to, passed directly to CLI
     */
    fromImageRef: string;
    /**
     * The new image with tag for the existing image, passed directly to CLI
     */
    toImageRef: string;
};

type TagImageCommand = {
    /**
     * Generate a CommandResponse for adding an additional tag to an existing
     * image.
     * @param options Command options
     */
    tagImage(options: TagImageCommandOptions): Promise<VoidCommandResponse>;
};

// Inspect Image Command Types

export const PortProtocolSchema = z.enum(['udp', 'tcp']);
export type PortProtocol = z.infer<typeof PortProtocolSchema>;

export const PortBindingSchema = z.object({
    containerPort: z.number().describe('The internal container port'),
    hostPort: z.number().optional().describe('The optional host port to bind to the container port'),
    hostIp: z.string().optional().describe('The optional host IP to bind the port on'),
    protocol: PortProtocolSchema.optional().describe('The protocol the port uses'),
});

export type PortBinding = z.infer<typeof PortBindingSchema>;

export const InspectImagesItemSchema = z.object({
    id: z.string().describe('The image ID'),
    image: ImageNameInfoSchema.describe('Image name information'),
    repoDigests: z.array(z.string()).describe('Repo digest values'),
    isLocalImage: z.boolean().describe('Is the image local only?'),
    environmentVariables: z.record(z.string(), z.string()).describe('Any environment variables associated with the image'),
    ports: z.array(PortBindingSchema).describe('Any default ports exposed by the image'),
    volumes: z.array(z.string()).describe('Any volumes defined by the image'),
    labels: z.record(z.string(), z.string()).describe('Any labels assigned to the image'),
    entrypoint: z.array(z.string()).describe('The entrypoint for running the image in a container'),
    command: z.array(z.string()).describe('The command used to start the image in a container'),
    currentDirectory: z.string().optional().describe('The default working directory in the image'),
    architecture: z.enum(['amd64', 'arm64']).optional().describe('The image architecture'),
    operatingSystem: ContainerOSSchema.optional().describe('The image operating system'),
    createdAt: z.date().optional().describe('The date the image was created'),
    user: z.string().optional().describe('The default user in the container'),
    raw: z.string().describe('The RAW inspect output'),
});

export type InspectImagesItem = z.infer<typeof InspectImagesItemSchema>;

/**
 * Options for inspecting images
 */
export type InspectImagesCommandOptions = CommonCommandOptions & {
    /**
     * The image names/IDs/etc. to inspect, passed directly to the CLI
     */
    imageRefs: Array<string>;
};

type InspectImagesCommand = {
    /**
     * Generate a CommandResponse for inspecting images
     * @param options Command options
     */
    inspectImages(options: InspectImagesCommandOptions): Promise<PromiseCommandResponse<Array<InspectImagesItem>>>;
};

//#endregion

//#region Container commands

// Run Container Command Types


export type RunContainerBindMount = {
    type: 'bind';
    source: string;
    destination: string;
    readOnly: boolean;
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

export type RunContainerCommandOptions = CommonCommandOptions & {
    /**
     * The image name/ID/etc. to run, passed directly to CLI
     */
    imageRef: string;
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
    pull?: 'always' | 'missing' | 'never';
    /**
     * Optional entrypoint for running the container
     */
    entrypoint?: string;
    /**
     * Optional command to use in starting the container
     */
    command?: Array<string> | string;
    /**
     * Optional expose ports for the container
     */
    exposePorts?: Array<number>;
    /**
     * Target platform for the container
     */
    platform?: ContainerPlatform;
    /**
     * Additional custom options to pass
     */
    customOptions?: string;
};

export const RunContainerIdSchema = z.string().optional();

export type RunContainerId = z.infer<typeof RunContainerIdSchema>;

type RunContainerCommand = {
    /**
     * Generate a CommandResponse for running a container.
     * @param options Command options
     */
    runContainer(options: RunContainerCommandOptions): Promise<PromiseCommandResponse<RunContainerId>>;
};

// Exec Container Command Types

export type ExecContainerCommandOptions = CommonCommandOptions & {
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
    execContainer(options: ExecContainerCommandOptions): Promise<GeneratorCommandResponse<string>>;
};

// List Containers Command Types

export type ListContainersCommandOptions = CommonCommandOptions & {
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

export const ListContainersItemSchema = z.object({
    id: z.string().describe('The ID of the container'),
    name: z.string().describe('The name of the container'),
    labels: z.record(z.string(), z.string()).describe('Labels on the container'),
    image: ImageNameInfoSchema.describe('Image name information'),
    ports: z.array(PortBindingSchema).describe('The exposed ports for the container'),
    networks: z.array(z.string()).describe('The list of connected networks for the container'),
    createdAt: z.date().describe('The date the container was created'),
    state: z.string().describe('The container state (e.g. \'running\', \'stopped\', \'paused\', etc.)'),
    status: z.string().optional().describe('The container status (e.g. \'Up 5 minutes\', \'Exited (0) 1 minute ago\', etc.)'),
});

export type ListContainersItem = z.infer<typeof ListContainersItemSchema>;

type ListContainersCommand = {
    /**
     * Generate a CommandResponse for listing containers.
     * @param options Command options
     */
    listContainers(options: ListContainersCommandOptions): Promise<PromiseCommandResponse<Array<ListContainersItem>>>;
};

// Stop Containers Command Types

export type StopContainersCommandOptions = CommonCommandOptions & {
    /**
     * Containers to stop
     */
    container: Array<string>;
    /**
     * Time (in seconds) to wait for graceful exit before halting the container
     */
    time?: number;
};

export const StopedContainersIdsSchema = z.array(z.string());

export type StopContainersIds = z.infer<typeof StopedContainersIdsSchema>;

type StopContainersCommand = {
    /**
     * Generate a CommandResponse for stopping container(s).
     * @param options Command options
     */
    stopContainers(options: StopContainersCommandOptions): Promise<PromiseCommandResponse<StopContainersIds>>;
};

// Start Containers Command Types

export type StartContainersCommandOptions = CommonCommandOptions & {
    /**
     * Containers to start
     */
    container: Array<string>;
};

export const StartContainersResultSchema = z.array(z.string());

export type StartContainersResult = z.infer<typeof StartContainersResultSchema>;

type StartContainersCommand = {
    /**
     * Generate a CommandResponse for starting container(s).
     * @param options Command options
     */
    startContainers(options: StartContainersCommandOptions): Promise<PromiseCommandResponse<StartContainersResult>>;
};

// Restart Containers Command Types

export type RestartContainersCommandOptions = CommonCommandOptions & {
    /**
     * Containers to restart
     */
    container: Array<string>;
    /**
     * Time (in seconds) to wait for graceful exit before halting the container
     */
    time?: number;
};

export const RestartContainersIdsSchema = z.array(z.string());

export type RestartContainersIds = z.infer<typeof RestartContainersIdsSchema>;

type RestartContainersCommand = {
    /**
     * Generate a CommandResponse for restarting container(s).
     * @param options Command options
     */
    restartContainers(options: RestartContainersCommandOptions): Promise<PromiseCommandResponse<RestartContainersIds>>;
};

// Remove Containers Command Types

export type RemoveContainersCommandOptions = CommonCommandOptions & {
    /**
     * Containers to remove
     */
    containers: Array<string>;
    /**
     * Force remove containers even if they aren't stopped?
     */
    force?: boolean;
};

export const RemovedContainersIdsSchema = z.array(z.string());

export type RemovedContainersIds = z.infer<typeof RemovedContainersIdsSchema>;

type RemoveContainersCommand = {
    /**
     * Generate a CommandResponse for removing container(s).
     * @param options Command options
     */
    removeContainers(options: RemoveContainersCommandOptions): Promise<PromiseCommandResponse<RemovedContainersIds>>;
};

// Prune Containers Command Types

export type PruneContainersCommandOptions = CommonCommandOptions & {
    // Intentionally empty for now
};

export const PruneContainersItemSchema = z.object({
    containersDeleted: z.array(z.string()).optional().describe('A list of the containers deleted'),
    spaceReclaimed: z.number().optional().describe('The amount of space (in bytes) reclaimed'),
});

export type PruneContainersItem = z.infer<typeof PruneContainersItemSchema>;

type PruneContainersCommand = {
    pruneContainers(options: PruneContainersCommandOptions): Promise<PromiseCommandResponse<PruneContainersItem>>
};

// Logs For Container Command Types

export type LogsForContainerCommandOptions = CommonCommandOptions & {
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
    logsForContainer(options: LogsForContainerCommandOptions): Promise<GeneratorCommandResponse<string>>;
};

// Inspect Container Command Types

/**
 * Options for inspecting containers
 */
export type InspectContainersCommandOptions = CommonCommandOptions & {
    /**
     * Containers to inspect
     */
    containers: Array<string>;
};

export const InspectContainersItemBindMountSchema = z.object({
    type: z.literal('bind'),
    source: z.string().describe('The source of the bind mount (path on host)'),
    destination: z.string().describe('The destination for the bind mount (path in container)'),
    readOnly: z.boolean().describe('Is the mount read only?'),
});

export type InspectContainersItemBindMount = z.infer<typeof InspectContainersItemBindMountSchema>;

export const InspectContainersItemVolumeMountSchema = z.object({
    type: z.literal('volume'),
    source: z.string().describe('The source of the volume mount (volume name)'),
    destination: z.string().describe('The destination for the volume mount (path in container)'),
    driver: z.string().optional().describe('The volume driver used'),
    readOnly: z.boolean().describe('Is the volume read only?'),
});

export type InspectContainersItemVolumeMount = z.infer<typeof InspectContainersItemVolumeMountSchema>;

export const InspectContainersItemMountSchema = z.union([
    InspectContainersItemBindMountSchema,
    InspectContainersItemVolumeMountSchema,
]);

export type InspectContainersItemMount = z.infer<typeof InspectContainersItemMountSchema>;

export const InspectContainersItemNetworkSchema = z.object({
    name: z.string().describe('The name of the network'),
    gateway: z.string().optional().describe('The network gateway address'),
    ipAddress: z.string().optional().describe('The root IP address of the network'),
    macAddress: z.string().optional().describe('The MAC address associated with the network'),
});

export type InspectContainersItemNetwork = z.infer<typeof InspectContainersItemNetworkSchema>;

export const InspectContainersItemSchema = z.object({
    id: z.string().describe('The ID of the container'),
    name: z.string().describe('The name of the container'),
    imageId: z.string().describe('The ID of the image used to run the container'),
    image: ImageNameInfoSchema.describe('Image name information'),
    isolation: z.string().optional().describe('Isolation Mode of the container'),
    status: z.string().optional().describe('The status of the container'),
    environmentVariables: z.record(z.string(), z.string()).describe('Environment variables set when running the container'),
    networks: z.array(InspectContainersItemNetworkSchema).describe('Networks attached to the container'),
    ipAddress: z.string().optional().describe('IP Address assigned to the container'),
    operatingSystem: ContainerOSSchema.optional().describe('The container operating system'),
    ports: z.array(PortBindingSchema).describe('Ports exposed for the container'),
    mounts: z.array(InspectContainersItemMountSchema).describe('Mounts attached to the container'),
    labels: z.record(z.string(), z.string()).describe('Labels assigned to the container'),
    entrypoint: z.array(z.string()).describe('The entrypoint used to start the container'),
    command: z.array(z.string()).describe('The command used to run the container'),
    currentDirectory: z.string().optional().describe('The default working directory in the container'),
    createdAt: z.date().describe('The date the container was created'),
    startedAt: z.date().optional().describe('The date the container was started'),
    finishedAt: z.date().optional().describe('The date the container stopped'),
    raw: z.string().describe('The raw JSON from the inspect record'),
});

export type InspectContainersItem = z.infer<typeof InspectContainersItemSchema>;

type InspectContainersCommand = {
    /**
     * Generate a CommandResponse for inspecting containers.
     * @param options Command options
     */
    inspectContainers(options: InspectContainersCommandOptions): Promise<PromiseCommandResponse<Array<InspectContainersItem>>>;
};

// Stats command types

/**
 * Options for container stats
 */
export type ContainersStatsCommandOptions = CommonCommandOptions & {
    all?: boolean;
};

type ContainersStatsCommand = {
    /**
     * Show running container stats
     * @param options Command options
     */
    statsContainers(options: ContainersStatsCommandOptions): Promise<VoidCommandResponse>;
};

// #endregion

// #region Volume commands

// Create Volume Command Types

export type CreateVolumeCommandOptions = CommonCommandOptions & {
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
    createVolume(options: CreateVolumeCommandOptions): Promise<VoidCommandResponse>;
};

// List Volumes Command Types

export type ListVolumesCommandOptions = CommonCommandOptions & {
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

export const ListVolumeItemSchema = z.object({
    name: z.string().describe('The name of the volume'),
    driver: z.string().describe('The volume driver'),
    labels: z.record(z.string(), z.string()).describe('Labels assigned to the volume'),
    mountpoint: z.string().describe('The mount point for the volume'),
    scope: z.string().describe('The scope for the volume'),
    createdAt: z.date().optional().describe('The date the volume was created at'),
    size: z.number().optional().describe('The size (in bytes) of the volume'),
});

export type ListVolumeItem = z.infer<typeof ListVolumeItemSchema>;

type ListVolumesCommand = {
    /**
     * Generate a CommandResponse for listing volumes
     * @param options Command options
     */
    listVolumes(options: ListVolumesCommandOptions): Promise<PromiseCommandResponse<Array<ListVolumeItem>>>;
};

// Remove Volumes Command Types

export type RemoveVolumesCommandOptions = CommonCommandOptions & {
    /**
     * Volumes to remove
     */
    volumes: Array<string>;
    /**
     * Force removing volumes even if they're attached to a container?
     */
    force?: boolean;
};

export const RemovedVolumesIdsSchema = z.array(z.string());

export type RemovedVolumesIds = z.infer<typeof RemovedVolumesIdsSchema>;

type RemoveVolumesCommand = {
    /**
     * Generate a CommandResponse for removing volumes
     * @param options Command options
     */
    removeVolumes(options: RemoveVolumesCommandOptions): Promise<PromiseCommandResponse<RemovedVolumesIds>>;
};

// Prune Volumes Command Types

/**
 * Standardized options for prune volume commands
 */
export type PruneVolumesCommandOptions = CommonCommandOptions & {
    // Intentionally empty for now
};

export const PruneVolumesItemSchema = z.object({
    volumesDeleted: z.array(z.string()).optional().describe('A list of the volumes deleted'),
    spaceReclaimed: z.number().optional().describe('The amount of space (in bytes) reclaimed'),
});

export type PruneVolumesItem = z.infer<typeof PruneVolumesItemSchema>;

type PruneVolumesCommand = {
    /**
     * Generate a CommandResponse for pruning volumes
     * @param options Command options
     */
    pruneVolumes(options: PruneVolumesCommandOptions): Promise<PromiseCommandResponse<PruneVolumesItem>>;
};

// Inspect Volumes Command Types

/**
 * Options for inspecting volumes
 */
export type InspectVolumesCommandOptions = CommonCommandOptions & {
    /**
     * Volumes to inspect
     */
    volumes: Array<string>;
};

export const InspectVolumesItemSchema = z.object({
    name: z.string().describe('The name of the volume'),
    driver: z.string().describe('The driver for the volume'),
    mountpoint: z.string().describe('The mount point for the volume'),
    scope: z.string().describe('The scope for the volume'),
    labels: z.record(z.string(), z.string()).describe('Labels assigned to the volume'),
    options: z.record(z.string(), z.unknown()).describe('Driver-specific options for the volume'),
    createdAt: z.date().describe('The date the volume was created'),
    raw: z.string().describe('The raw JSON from the inspect record'),
});

export type InspectVolumesItem = z.infer<typeof InspectVolumesItemSchema>;

type InspectVolumesCommand = {
    /**
     * Generate a CommandResponse for inspecting volumes.
     * @param options Command options
     */
    inspectVolumes(options: InspectVolumesCommandOptions): Promise<PromiseCommandResponse<Array<InspectVolumesItem>>>;
};

// #endregion

// #region Network commands

// Create Network Command Types

export type CreateNetworkCommandOptions = CommonCommandOptions & {
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
    createNetwork(options: CreateNetworkCommandOptions): Promise<VoidCommandResponse>;
};

// List Networks Command Types

export type ListNetworksCommandOptions = CommonCommandOptions & {
    /**
     * Only list networks that match the given labels
     */
    labels?: LabelFilters;
    /**
     * Only list networks with a given driver
     */
    driver?: string;
};

export const ListNetworkItemSchema = z.object({
    name: z.string().describe('The name of the network'),
    id: z.string().optional().describe('The ID of the network'),
    driver: z.string().optional().describe('The network driver'),
    labels: z.record(z.string(), z.string()).describe('Labels assigned to the network'),
    scope: z.string().optional().describe('The network scope'),
    ipv6: z.boolean().optional().describe('True if IPv6 network'),
    createdAt: z.date().optional().describe('The date the network was created'),
    internal: z.boolean().optional().describe('True if internal network'),
});

export type ListNetworkItem = z.infer<typeof ListNetworkItemSchema>;

type ListNetworksCommand = {
    /**
     * Generate a CommandResponse for listing networks
     * @param options Command options
     */
    listNetworks(options: ListNetworksCommandOptions): Promise<PromiseCommandResponse<Array<ListNetworkItem>>>;
};

// Remove Networks Command Types

export type RemoveNetworksCommandOptions = CommonCommandOptions & {
    /**
     * Networks to remove
     */
    networks: Array<string>;
    /**
     * Force removing networks even if they're attached to a container?
     */
    force?: boolean;
};

export const RemovedNetworksIdsSchema = z.array(z.string());

export type RemovedNetworksIds = z.infer<typeof RemovedNetworksIdsSchema>;

type RemoveNetworksCommand = {
    /**
     * Generate a CommandResponse for removing networks
     * @param options Command options
     */
    removeNetworks(options: RemoveNetworksCommandOptions): Promise<PromiseCommandResponse<RemovedNetworksIds>>;
};

// Prune Networks Command Types

/**
 * Standardized options for prune network commands
 */
export type PruneNetworksCommandOptions = CommonCommandOptions & {
    // Intentionally empty for now
};

export const PruneNetworksItemSchema = z.object({
    networksDeleted: z.array(z.string()).optional().describe('A list of the networks deleted'),
});

export type PruneNetworksItem = z.infer<typeof PruneNetworksItemSchema>;

type PruneNetworksCommand = {
    /**
     * Generate a CommandResponse for pruning networks
     * @param options Command options
     */
    pruneNetworks(options: PruneNetworksCommandOptions): Promise<PromiseCommandResponse<PruneNetworksItem>>;
};

// Inspect Networks Command Types

/**
 * Options for inspecting networks
 */
export type InspectNetworksCommandOptions = CommonCommandOptions & {
    /**
     * Networks to inspect
     */
    networks: Array<string>;
};

export const NetworkIpamConfigSchema = z.object({
    driver: z.string(),
    config: z.array(z.object({
        subnet: z.string(),
        gateway: z.string(),
    })),
});

export type NetworkIpamConfig = z.infer<typeof NetworkIpamConfigSchema>;

export const InspectNetworksItemSchema = z.object({
    name: z.string().describe('The name of the network'),
    id: z.string().optional().describe('The ID of the network'),
    driver: z.string().optional().describe('The network driver'),
    labels: z.record(z.string(), z.string()).describe('Labels assigned to the network'),
    scope: z.string().optional().describe('The network scope'),
    ipam: NetworkIpamConfigSchema.optional().describe('The IPAM config'),
    ipv6: z.boolean().optional().describe('True if IPv6 network'),
    internal: z.boolean().optional().describe('True if internal network'),
    attachable: z.boolean().optional().describe('True if attachable'),
    ingress: z.boolean().optional().describe('True if ingress'),
    createdAt: z.date().optional().describe('The date the network was created'),
    raw: z.string().describe('The raw JSON from the inspect record'),
});

export type InspectNetworksItem = z.infer<typeof InspectNetworksItemSchema>;

type InspectNetworksCommand = {
    /**
     * Generate a CommandResponse for inspecting networks.
     * @param options Command options
     */
    inspectNetworks(options: InspectNetworksCommandOptions): Promise<PromiseCommandResponse<Array<InspectNetworksItem>>>;
};

// #endregion

// #region Context commands

// List Contexts Command Types

export type ListContextsCommandOptions = CommonCommandOptions & {
    // Intentionally empty for now
};

export const ListContextItemSchema = z.object({
    name: z.string().describe('The name of the context'),
    description: z.string().optional().describe('The description of the context'),
    current: z.boolean().describe('Whether or not the context is currently selected'),
    containerEndpoint: z.string().optional().describe('The endpoint used for the container daemon'),
});

export type ListContextItem = z.infer<typeof ListContextItemSchema>;

type ListContextsCommand = {
    /**
     * Generate a CommandResponse for listing contexts
     * @param options Command options
     */
    listContexts(options: ListContextsCommandOptions): Promise<PromiseCommandResponse<Array<ListContextItem>>>;
};

// Remove Contexts Command Types

export type RemoveContextsCommandOptions = CommonCommandOptions & {
    /**
     * Contexts to remove
     */
    contexts: Array<string>;
};

export const RemovedContextsSchema = z.array(z.string());

export type RemovedContexts = z.infer<typeof RemovedContextsSchema>;

type RemoveContextsCommand = {
    /**
     * Generate a CommandResponse for removing contexts
     * @param options Command options
     */
    removeContexts(options: RemoveContextsCommandOptions): Promise<PromiseCommandResponse<RemovedContexts>>;
};

// Use Context Command Types

export type UseContextCommandOptions = CommonCommandOptions & {
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
    useContext(options: UseContextCommandOptions): Promise<VoidCommandResponse>;
};

// Inspect Contexts Command Types

/**
 * Options for inspecting contexts
 */
export type InspectContextsCommandOptions = CommonCommandOptions & {
    /**
     * Contexts to inspect
     */
    contexts: Array<string>;
};

export const InspectContextsItemSchema = z.object({
    name: z.string().describe('The name of the context'),
    description: z.string().optional().describe('The description of the context'),
    raw: z.string().describe('The raw JSON from the inspect record'),
});

export type InspectContextsItem = z.infer<typeof InspectContextsItemSchema>;

type InspectContextsCommand = {
    /**
     * Generate a CommandResponse for inspecting contexts.
     * @param options Command options
     */
    inspectContexts(options: InspectContextsCommandOptions): Promise<PromiseCommandResponse<Array<InspectContextsItem>>>;
};

// #endregion

// #region Container filesystem commands

// List files command types

export type ListFilesCommandOptions = CommonCommandOptions & {
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

export const ListFilesItemSchema = z.object({
    name: z.string().describe('The name of the file/directory'),
    path: z.string().describe('The absolute path of the file/directory within the container'),
    size: z.number().describe('The size of the file (0 if a directory), in bytes'),
    type: z.nativeEnum(FileType).describe('The type of the file item (file/directory)'),
    mode: z.number().optional().describe('The mode (permissions) of the file in base 10'),
    uid: z.number().optional().describe('The (container) uid of the user the file belongs to'),
    gid: z.number().optional().describe('The (container) gid of the user the file belongs to'),
    mtime: z.number().optional().describe('The modification time of the file/directory, in milliseconds since Unix epoch'),
    ctime: z.number().optional().describe('The creation time of the file/directory, in milliseconds since Unix epoch'),
    atime: z.number().optional().describe('The access time of the file/directory, in milliseconds since Unix epoch'),
});

export type ListFilesItem = z.infer<typeof ListFilesItemSchema>;

type ListFilesCommand = {
    /**
     * Lists the contents of a given path in a container
     * @param options Command options
     */
    listFiles(options: ListFilesCommandOptions): Promise<PromiseCommandResponse<Array<ListFilesItem>>>;
};

// Stat path command types

export type StatPathCommandOptions = CommonCommandOptions & {
    /**
    * The container to execute a command in
    */
    container: string;
    /**
     * The absolute path of a file or directory in the container to get stats for
     */
    path: string;
    /**
     * The container operating system. If not supplied, 'linux' will be assumed.
     */
    operatingSystem?: ContainerOS;
};

export const StatPathItemSchema = ListFilesItemSchema;

export type StatPathItem = z.infer<typeof StatPathItemSchema>;

type StatPathCommand = {
    /**
     * Gets stats for a given file in a container
     * @param options Command options
     */
    statPath(options: StatPathCommandOptions): Promise<PromiseCommandResponse<StatPathItem | undefined>>;
};

// Read file command types

export type ReadFileCommandOptions = CommonCommandOptions & {
    /**
    * The container to execute a command in
    */
    container: string;
    /**
     * The absolute path of the file in the container to read
     */
    path: string;
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
    readFile(options: ReadFileCommandOptions): Promise<GeneratorCommandResponse<Buffer>>;
};

// Write file command types

export type WriteFileCommandOptions = CommonCommandOptions & {
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
    writeFile(options: WriteFileCommandOptions): Promise<VoidCommandResponse>;
};

// #endregion

/**
 * Standard interface for executing commands against container runtimes.
 * Individual runtimes implement this interface.
 */
export interface IContainersClient extends
    ClientIdentity,
    ImageNameDefaults,
    VersionCommand,
    CheckInstallCommand,
    InfoCommand,
    GetEventStreamCommand,
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
    StatPathCommand,
    ReadFileCommand,
    WriteFileCommand { }
