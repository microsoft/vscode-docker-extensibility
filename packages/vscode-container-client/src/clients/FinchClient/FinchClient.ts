/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    byteStreamToGenerator,
    CancellationError,
    CancellationTokenLike,
    CommandLineArgs,
    composeArgs,
    toArray,
    withArg,
    withFlagArg,
    withNamedArg,
    withVerbatimArg
} from '@microsoft/vscode-processutils';
import * as readline from 'readline';
import {
    EventItem,
    EventStreamCommandOptions,
    IContainersClient,
    InfoItem,
    InspectContainersCommandOptions,
    InspectContainersItem,
    InspectImagesCommandOptions,
    InspectImagesItem,
    InspectNetworksItem,
    InspectVolumesItem,
    ListContainersCommandOptions,
    ListContainersItem,
    ListImagesCommandOptions,
    ListImagesItem,
    ListNetworkItem,
    ListNetworksCommandOptions,
    ListVolumeItem,
    ListVolumesCommandOptions,
    ReadFileCommandOptions,
    RunContainerCommandOptions,
    VersionItem,
    WriteFileCommandOptions
} from '../../contracts/ContainerClient';
import { GeneratorCommandResponse, VoidCommandResponse } from '../../contracts/CommandRunner';
import { dayjs } from '../../utils/dayjs';
import { DockerClientBase } from '../DockerClientBase/DockerClientBase';
import { withDockerAddHostArg } from '../DockerClientBase/withDockerAddHostArg';
import { withDockerEnvArg } from '../DockerClientBase/withDockerEnvArg';
import { withDockerJsonFormatArg } from '../DockerClientBase/withDockerJsonFormatArg';
import { withDockerLabelFilterArgs } from '../DockerClientBase/withDockerLabelFilterArgs';
import { withDockerLabelsArg } from '../DockerClientBase/withDockerLabelsArg';
import { withDockerMountsArg } from '../DockerClientBase/withDockerMountsArg';
import { withDockerPlatformArg } from '../DockerClientBase/withDockerPlatformArg';
import { withDockerPortsArg } from '../DockerClientBase/withDockerPortsArg';
import { FinchEventRecordSchema, parseContainerdEventPayload, parseContainerdTopic } from './FinchEventRecord';
import { withFinchExposedPortsArg } from './withFinchExposedPortsArg';
import { FinchInspectContainerRecordSchema, normalizeFinchInspectContainerRecord } from './FinchInspectContainerRecord';
import { FinchInspectImageRecordSchema, normalizeFinchInspectImageRecord } from './FinchInspectImageRecord';
import { FinchInspectNetworkRecordSchema, normalizeFinchInspectNetworkRecord } from './FinchInspectNetworkRecord';
import { FinchInspectVolumeRecordSchema, normalizeFinchInspectVolumeRecord } from './FinchInspectVolumeRecord';
import { FinchListContainerRecordSchema, normalizeFinchListContainerRecord } from './FinchListContainerRecord';
import { FinchListImageRecordSchema, normalizeFinchListImageRecord } from './FinchListImageRecord';
import { FinchListNetworkRecordSchema, normalizeFinchListNetworkRecord } from './FinchListNetworkRecord';
import { FinchVersionRecordSchema } from './FinchVersionRecord';

export class FinchClient extends DockerClientBase implements IContainersClient {
    /**
     * The ID of the Finch client
     */
    public static ClientId = 'com.microsoft.visualstudio.containers.finch';

    /**
     * The default argument given to `--format`
     * Finch (nerdctl) uses the same format as Docker
     */
    protected readonly defaultFormatForJson: string = "{{json .}}";

    /**
     * Constructs a new {@link FinchClient}
     * @param commandName (Optional, default `finch`) The command that will be run
     * as the base command. If quoting is necessary, it is the responsibility of the
     * caller to add.
     * @param displayName (Optional, default 'Finch') The human-friendly display
     * name of the client
     * @param description (Optional, with default) The human-friendly description of
     * the client
     */
    public constructor(
        commandName: string = 'finch',
        displayName: string = 'Finch',
        description: string = 'Runs container commands using the Finch CLI'
    ) {
        super(
            FinchClient.ClientId,
            commandName,
            displayName,
            description
        );
    }

    //#region RunContainer Command

    /**
     * Generates run container command args with Finch-specific handling for exposed ports.
     *
     * Finch/nerdctl doesn't support `--expose` and `--publish-all` flags.
     * Instead, when both `publishAllPorts` and `exposePorts` are specified, we convert
     * exposed ports to explicit `-p <containerPort>` arguments which bind them to
     * random host ports (equivalent to Docker's --expose + --publish-all behavior).
     */
    protected override getRunContainerCommandArgs(options: RunContainerCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('container', 'run'),
            withFlagArg('--detach', options.detached),
            withFlagArg('--interactive', options.interactive),
            withFlagArg('--tty', options.interactive), // TTY only for interactive mode, not detached
            withFlagArg('--rm', options.removeOnExit),
            withNamedArg('--name', options.name),
            withDockerPortsArg(options.ports),
            // Finch alternative: Convert exposePorts + publishAllPorts to -p <port> args
            withFinchExposedPortsArg(options.exposePorts, options.publishAllPorts),
            withNamedArg('--network', options.network),
            withNamedArg('--network-alias', options.networkAlias),
            withDockerAddHostArg(options.addHost),
            withDockerMountsArg(options.mounts),
            withDockerLabelsArg(options.labels),
            withDockerEnvArg(options.environmentVariables),
            withNamedArg('--env-file', options.environmentFiles),
            withNamedArg('--entrypoint', options.entrypoint),
            withDockerPlatformArg(options.platform),
            withVerbatimArg(options.customOptions),
            withArg(options.imageRef),
            typeof options.command === 'string' ? withVerbatimArg(options.command) : withArg(...(toArray(options.command ?? []))),
        )();
    }

    //#endregion

    //#region Version Command

    protected override parseVersionCommandOutput(output: string, strict: boolean): Promise<VersionItem> {
        try {
            const version = FinchVersionRecordSchema.parse(JSON.parse(output));

            // Finch/nerdctl may not have a traditional ApiVersion
            // Extract version info from the Client object
            const clientVersion = version.Client.Version;

            // For server components, try to find containerd version
            const serverComponent = version.Server?.Components?.find(c =>
                c.Name.toLowerCase() === 'containerd' || c.Name.toLowerCase() === 'server'
            );

            return Promise.resolve({
                client: clientVersion || 'unknown',
                server: serverComponent?.Version,
            });
        } catch {
            // If parsing fails with the new schema, try to extract version from output
            // as nerdctl might output version info differently
            if (strict) {
                throw new Error('Failed to parse Finch version output');
            }

            return Promise.resolve({
                client: 'unknown',
                server: undefined,
            });
        }
    }

    //#endregion

    //#region Info Command

    protected override parseInfoCommandOutput(output: string, strict: boolean): Promise<InfoItem> {
        // Finch/nerdctl info output is similar to Docker but may have different fields
        try {
            const info = JSON.parse(output) as { OperatingSystem?: string; OSType?: string };
            // Normalize osType to valid enum values
            const osType = info.OSType?.toLowerCase();
            const normalizedOsType: 'linux' | 'windows' | undefined =
                osType === 'linux' ? 'linux' : osType === 'windows' ? 'windows' : undefined;

            return Promise.resolve({
                operatingSystem: info.OperatingSystem ?? info.OSType,
                osType: normalizedOsType ?? 'linux',
                raw: output,
            });
        } catch (err) {
            // In strict mode, propagate the error instead of returning fallback
            if (strict) {
                return Promise.reject(err instanceof Error ? err : new Error(String(err)));
            }
            return Promise.resolve({
                operatingSystem: undefined,
                osType: 'linux',
                raw: output,
            });
        }
    }

    //#endregion

    //#region GetEventStream Command

    /**
     * Finch/nerdctl event stream limitations:
     * - Does NOT support --since and --until flags (no historical replay)
     * - Does NOT support Docker-style filters (type=, event=)
     * - Outputs containerd native events, NOT Docker-compatible format
     *
     * Client-side filtering is implemented in parseEventStreamCommandOutput to:
     * - Filter by event types (container, image, etc.)
     * - Filter by event actions (create, delete, start, stop, etc.)
     * - Filter by since/until timestamps (when provided)
     */
    protected override getEventStreamCommandArgs(_options: EventStreamCommandOptions): CommandLineArgs {
        // Finch/nerdctl events command doesn't support Docker-style filters
        // All filtering is done client-side in parseEventStreamCommandOutput
        return composeArgs(
            withArg('events'),
            withDockerJsonFormatArg(this.defaultFormatForJson),
        )();
    }

    protected override async *parseEventStreamCommandOutput(
        options: EventStreamCommandOptions,
        output: NodeJS.ReadableStream,
        strict: boolean,
        cancellationToken?: CancellationTokenLike
    ): AsyncGenerator<EventItem> {
        cancellationToken ??= CancellationTokenLike.None;

        const lineReader = readline.createInterface({
            input: output,
            crlfDelay: Infinity,
        });

        // Parse since/until timestamps for client-side filtering
        const sinceTimestamp = options.since ? this.parseEventTimestamp(options.since) : undefined;
        const untilTimestamp = options.until ? this.parseEventTimestamp(options.until) : undefined;

        try {
            for await (const line of lineReader) {
                if (cancellationToken.isCancellationRequested) {
                    throw new CancellationError('Event stream cancelled', cancellationToken);
                }

                // Skip empty lines (Finch outputs newlines between events)
                const trimmedLine = line.trim();
                if (!trimmedLine) {
                    continue;
                }

                try {
                    const item = FinchEventRecordSchema.parse(JSON.parse(trimmedLine));

                    // Parse the containerd topic to get type and action
                    const typeAction = parseContainerdTopic(item.Topic);
                    if (!typeAction) {
                        // Skip events we can't map (e.g., internal snapshot events)
                        continue;
                    }

                    const { type, action } = typeAction;

                    // Client-side type filtering
                    if (options.types && options.types.length > 0 && !options.types.includes(type)) {
                        continue;
                    }

                    // Client-side action filtering
                    if (options.events && options.events.length > 0 && !options.events.includes(action)) {
                        continue;
                    }

                    // Parse the event timestamp
                    const timestamp = new Date(item.Timestamp);

                    // Client-side since filtering
                    if (sinceTimestamp && timestamp < sinceTimestamp) {
                        continue;
                    }

                    // Client-side until filtering - stop streaming if we've passed the until time
                    if (untilTimestamp && timestamp > untilTimestamp) {
                        break;
                    }

                    // Parse the actor from the nested Event JSON
                    const actor = parseContainerdEventPayload(item.Event);

                    yield {
                        type,
                        action,
                        actor,
                        timestamp,
                        raw: line,
                    };
                } catch (err) {
                    if (strict) {
                        throw err;
                    }
                }
            }
        } finally {
            lineReader.close();
        }
    }

    /**
     * Parse event timestamp from various formats:
     * - Unix timestamp (number or string number)
     * - Relative time like "1m", "5s", "-1s" (negative means in the future)
     * - ISO date string
     */
    private parseEventTimestamp(value: string | number): Date {
        if (typeof value === 'number') {
            return new Date(value * 1000);
        }

        // Try as Unix timestamp
        const asNumber = parseInt(value, 10);
        if (!Number.isNaN(asNumber) && String(asNumber) === value) {
            return new Date(asNumber * 1000);
        }

        // Try as relative time (e.g., "1m", "5s", "-30s")
        const relativeMatch = /^(-?\d+)(s|m|h|d)$/.exec(value);
        if (relativeMatch) {
            const amount = parseInt(relativeMatch[1], 10);
            const unit = relativeMatch[2];
            const now = Date.now();
            const multipliers: Record<string, number> = {
                's': 1000,
                'm': 60 * 1000,
                'h': 60 * 60 * 1000,
                'd': 24 * 60 * 60 * 1000,
            };
            return new Date(now + amount * (multipliers[unit] ?? 1000));
        }

        // Try as ISO date string
        return new Date(value);
    }

    //#endregion

    //#region ListImages Command

    protected override parseListImagesCommandOutput(options: ListImagesCommandOptions, output: string, strict: boolean): Promise<ListImagesItem[]> {
        const images = new Array<ListImagesItem>();

        try {
            output.split('\n').forEach((imageJson) => {
                try {
                    if (!imageJson) {
                        return;
                    }

                    const rawImage = FinchListImageRecordSchema.parse(JSON.parse(imageJson));
                    images.push(normalizeFinchListImageRecord(rawImage));
                } catch (err) {
                    if (strict) {
                        throw err;
                    }
                }
            });
        } catch (err) {
            if (strict) {
                throw err;
            }
        }

        return Promise.resolve(images);
    }

    //#endregion

    //#region InspectImages Command

    protected override parseInspectImagesCommandOutput(
        options: InspectImagesCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<Array<InspectImagesItem>> {
        const results = new Array<InspectImagesItem>();

        try {
            // nerdctl inspect returns a JSON array, not newline-separated JSON
            const parsed: unknown = JSON.parse(output);

            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    try {
                        const inspect = FinchInspectImageRecordSchema.parse(item);
                        results.push(normalizeFinchInspectImageRecord(inspect, JSON.stringify(item)));
                    } catch (err) {
                        if (strict) {
                            throw err;
                        }
                    }
                }
            } else {
                // Single object case
                const inspect = FinchInspectImageRecordSchema.parse(parsed);
                results.push(normalizeFinchInspectImageRecord(inspect, output));
            }
        } catch (err) {
            if (strict) {
                throw err;
            }
        }

        return Promise.resolve(results);
    }

    //#endregion

    //#region ListContainers Command

    protected override parseListContainersCommandOutput(options: ListContainersCommandOptions, output: string, strict: boolean): Promise<ListContainersItem[]> {
        const containers = new Array<ListContainersItem>();

        try {
            output.split('\n').forEach((containerJson) => {
                try {
                    if (!containerJson) {
                        return;
                    }

                    const rawContainer = FinchListContainerRecordSchema.parse(JSON.parse(containerJson));
                    containers.push(normalizeFinchListContainerRecord(rawContainer, strict));
                } catch (err) {
                    if (strict) {
                        throw err;
                    }
                }
            });
        } catch (err) {
            if (strict) {
                throw err;
            }
        }

        return Promise.resolve(containers);
    }

    //#endregion

    //#region InspectContainers Command

    protected override parseInspectContainersCommandOutput(options: InspectContainersCommandOptions, output: string, strict: boolean): Promise<InspectContainersItem[]> {
        const results = new Array<InspectContainersItem>();

        try {
            // nerdctl inspect returns a JSON array, not newline-separated JSON
            const parsed: unknown = JSON.parse(output);

            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    try {
                        const inspect = FinchInspectContainerRecordSchema.parse(item);
                        results.push(normalizeFinchInspectContainerRecord(inspect, JSON.stringify(item)));
                    } catch (err) {
                        if (strict) {
                            throw err;
                        }
                    }
                }
            } else {
                // Single object case
                const inspect = FinchInspectContainerRecordSchema.parse(parsed);
                results.push(normalizeFinchInspectContainerRecord(inspect, output));
            }
        } catch (err) {
            if (strict) {
                throw err;
            }
        }

        return Promise.resolve(results);
    }

    //#endregion

    //#region ListNetworks Command

    // Finch/nerdctl doesn't support --no-trunc for network ls
    protected override getListNetworksCommandArgs(options: ListNetworksCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('network', 'ls'),
            withDockerLabelFilterArgs(options.labels),
            // Note: Finch doesn't support --no-trunc for network ls
            withDockerJsonFormatArg(this.defaultFormatForJson),
        )();
    }

    protected override parseListNetworksCommandOutput(options: ListNetworksCommandOptions, output: string, strict: boolean): Promise<ListNetworkItem[]> {
        const results = new Array<ListNetworkItem>();

        try {
            output.split('\n').forEach((networkJson) => {
                try {
                    if (!networkJson) {
                        return;
                    }

                    const rawNetwork = FinchListNetworkRecordSchema.parse(JSON.parse(networkJson));
                    results.push(normalizeFinchListNetworkRecord(rawNetwork));
                } catch (err) {
                    if (strict) {
                        throw err;
                    }
                }
            });
        } catch (err) {
            if (strict) {
                throw err;
            }
        }

        return Promise.resolve(results);
    }

    //#endregion

    //#region InspectNetworks Command

    protected override parseInspectNetworksCommandOutput(options: ListNetworksCommandOptions, output: string, strict: boolean): Promise<InspectNetworksItem[]> {
        const results = new Array<InspectNetworksItem>();

        try {
            // nerdctl network inspect returns a JSON array
            const parsed: unknown = JSON.parse(output);

            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    try {
                        const inspect = FinchInspectNetworkRecordSchema.parse(item);
                        results.push(normalizeFinchInspectNetworkRecord(inspect, JSON.stringify(item)));
                    } catch (err) {
                        if (strict) {
                            throw err;
                        }
                    }
                }
            } else {
                // Single object case
                const inspect = FinchInspectNetworkRecordSchema.parse(parsed);
                results.push(normalizeFinchInspectNetworkRecord(inspect, output));
            }
        } catch (err) {
            if (strict) {
                throw err;
            }
        }

        return Promise.resolve(results);
    }

    //#endregion

    //#region ListVolumes Command

    protected override parseListVolumesCommandOutput(options: ListVolumesCommandOptions, output: string, strict: boolean): Promise<ListVolumeItem[]> {
        const volumes = new Array<ListVolumeItem>();

        try {
            output.split('\n').forEach((volumeJson) => {
                try {
                    if (!volumeJson) {
                        return;
                    }

                    const rawVolume = FinchInspectVolumeRecordSchema.parse(JSON.parse(volumeJson));
                    // Labels can be an empty string "" in Finch when no labels are set
                    const labels = typeof rawVolume.Labels === 'string' ? {} : (rawVolume.Labels ?? {});
                    const createdAt = rawVolume.CreatedAt
                        ? dayjs.utc(rawVolume.CreatedAt)
                        : undefined;

                    volumes.push({
                        name: rawVolume.Name,
                        driver: rawVolume.Driver || 'local',
                        labels,
                        mountpoint: rawVolume.Mountpoint || '',
                        scope: rawVolume.Scope || 'local',
                        createdAt: createdAt?.toDate(),
                        size: undefined, // nerdctl doesn't always provide size in list
                    });
                } catch (err) {
                    if (strict) {
                        throw err;
                    }
                }
            });
        } catch (err) {
            if (strict) {
                throw err;
            }
        }

        return Promise.resolve(volumes);
    }

    //#endregion

    //#region InspectVolumes Command

    protected override parseInspectVolumesCommandOutput(options: ListVolumesCommandOptions, output: string, strict: boolean): Promise<InspectVolumesItem[]> {
        const results = new Array<InspectVolumesItem>();

        try {
            // nerdctl volume inspect returns a JSON array
            const parsed: unknown = JSON.parse(output);

            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    try {
                        const inspect = FinchInspectVolumeRecordSchema.parse(item);
                        results.push(normalizeFinchInspectVolumeRecord(inspect, JSON.stringify(item)));
                    } catch (err) {
                        if (strict) {
                            throw err;
                        }
                    }
                }
            } else {
                // Single object case
                const inspect = FinchInspectVolumeRecordSchema.parse(parsed);
                results.push(normalizeFinchInspectVolumeRecord(inspect, output));
            }
        } catch (err) {
            if (strict) {
                throw err;
            }
        }

        return Promise.resolve(results);
    }

    //#endregion

    //#region ReadFile Command

    /**
     * Finch/nerdctl doesn't support streaming tar archives to stdout via `cp container:/path -`.
     * Instead, we use a shell command that:
     * 1. Creates a temp file
     * 2. Copies from container to temp file
     * 3. Outputs temp file to stdout (as tar archive)
     * 4. Cleans up temp file
     */
    override readFile(options: ReadFileCommandOptions): Promise<GeneratorCommandResponse<Buffer>> {
        if (options.operatingSystem === 'windows') {
            // Windows containers use exec with type command (same as Docker)
            return super.readFile(options);
        }

        const containerPath = `${options.container}:${options.path}`;

        // Use bash to chain operations: mktemp -> finch cp -> tar -> cleanup
        // We use tar to create a proper tar archive from the copied file/directory
        return Promise.resolve({
            command: 'bash',
            args: [
                '-c',
                `TMPDIR=$(mktemp -d) && ${this.commandName} cp "${containerPath}" "$TMPDIR/content" && tar -C "$TMPDIR" -cf - content && rm -rf "$TMPDIR"`,
            ],
            parseStream: (output) => byteStreamToGenerator(output),
        });
    }

    //#endregion

    //#region WriteFile Command

    /**
     * Finch/nerdctl doesn't support reading tar archives from stdin via `cp - container:/path`.
     * Instead, we use a shell command that:
     * 1. Creates a temp file
     * 2. Reads tar archive from stdin to temp file
     * 3. Extracts and copies to container
     * 4. Cleans up temp file
     *
     * Alternatively, if inputFile is provided, we use that directly.
     */
    override writeFile(options: WriteFileCommandOptions): Promise<VoidCommandResponse> {
        // If inputFile is specified, we can use finch cp directly (no stdin needed)
        if (options.inputFile) {
            return super.writeFile(options);
        }

        const containerPath = `${options.container}:${options.path}`;

        // Use bash to chain operations: mktemp -> extract tar from stdin -> finch cp -> cleanup
        return Promise.resolve({
            command: 'bash',
            args: [
                '-c',
                `TMPDIR=$(mktemp -d) && tar -C "$TMPDIR" -xf - && ${this.commandName} cp "$TMPDIR/." "${containerPath}" && rm -rf "$TMPDIR"`,
            ],
        });
    }

    //#endregion
}
