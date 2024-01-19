/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dayjs from 'dayjs';
import * as customParseFormat from 'dayjs/plugin/customParseFormat';
import * as utc from 'dayjs/plugin/utc';
import * as readline from 'readline';
import {
    EventItem,
    EventStreamCommandOptions,
    IContainersClient,
    InfoItem,
    ListContainersCommandOptions,
    ListContainersItem,
    ListImagesCommandOptions,
    ListImagesItem,
    ListVolumeItem,
    ListVolumesCommandOptions,
    PortBinding,
    VersionItem
} from '../../contracts/ContainerClient';
import { parseDockerLikeImageName } from '../../utils/parseDockerLikeImageName';
import { isPodmanListContainerRecord } from './PodmanListContainerRecord';
import { isPodmanImageRecord } from './PodmanImageRecord';
import { isPodmanVersionRecord } from './PodmanVersionRecord';
import { isPodmanVolumeRecord } from './PodmanVolumeRecord';
import { DockerClientBase } from '../DockerClientBase/DockerClientBase';
import { CancellationTokenLike } from '../../typings/CancellationTokenLike';
import { CancellationError } from '../../utils/CancellationError';
import { PodmanEventRecord, isPodmanEventRecord } from './PodmanEventRecord';

dayjs.extend(customParseFormat);
dayjs.extend(utc);

export class PodmanClient extends DockerClientBase implements IContainersClient {
    /**
     * The ID of the Podman client
     */
    public static ClientId = 'com.microsoft.visualstudio.containers.podman';

    /**
     * Constructs a new {@link PodmanClient}
     * @param commandName (Optional, default `podman`) The command that will be run
     * as the base command. If quoting is necessary, it is the responsibility of the
     * caller to add.
     * @param displayName (Optional, default 'Podman') The human-friendly display
     * name of the client
     * @param description (Optional, with default) The human-friendly description of
     * the client
     */
    public constructor(
        commandName: string = 'podman',
        displayName: string = 'Podman',
        description: string = 'Runs container commands using the Podman CLI'
    ) {
        super(
            PodmanClient.ClientId,
            commandName,
            displayName,
            description
        );
    }

    //#region Version Command

    protected async parseVersionCommandOutput(output: string, strict: boolean): Promise<VersionItem> {
        const version = JSON.parse(output);
        if (!isPodmanVersionRecord(version)) {
            throw new Error('Invalid version JSON');
        }

        return {
            client: version.Client.APIVersion,
            server: version.Server?.APIVersion,
        };
    }

    //#endregion

    //#region Info Command

    protected async parseInfoCommandOutput(output: string, strict: boolean): Promise<InfoItem> {
        return {
            operatingSystem: undefined, // Podman doesn't list an OS in its `info` command
            osType: 'linux',
            raw: output,
        };
    }

    //#endregion

    //#region GetEventStream Command

    protected override async *parseEventStreamCommandOutput(
        options: EventStreamCommandOptions,
        output: NodeJS.ReadableStream,
        strict: boolean,
        cancellationToken?: CancellationTokenLike
    ): AsyncGenerator<EventItem> {
        cancellationToken ||= CancellationTokenLike.None;

        const lineReader = readline.createInterface({
            input: output,
            crlfDelay: Infinity,
        });

        for await (const line of lineReader) {
            if (cancellationToken.isCancellationRequested) {
                throw new CancellationError('Event stream cancelled', cancellationToken);
            }

            try {
                // Parse a line at a time
                const item: PodmanEventRecord = JSON.parse(line);
                if (!isPodmanEventRecord(item)) {
                    throw new Error('Invalid event JSON');
                }

                // Yield the parsed data
                yield {
                    type: item.Type,
                    action: item.Status,
                    actor: { id: item.Name, attributes: item.Attributes || {} },
                    timestamp: new Date(item.Time),
                    raw: JSON.stringify(line),
                };
            } catch (err) {
                if (strict) {
                    throw err;
                }
            }
        }
    }

    //#endregion

    //#region ListImages Command

    protected override async parseListImagesCommandOutput(options: ListImagesCommandOptions, output: string, strict: boolean): Promise<ListImagesItem[]> {
        const images = new Array<ListImagesItem>();
        try {
            const rawImages = JSON.parse(output);
            rawImages.forEach((rawImage: unknown) => {
                try {
                    if (!isPodmanImageRecord(rawImage)) {
                        throw new Error('Invalid image JSON');
                    }

                    const createdAt = dayjs.unix(rawImage.Created).toDate();

                    images.push({
                        id: rawImage.Id,
                        image: parseDockerLikeImageName(rawImage.Names?.[0]),
                        // labels: rawImage.Labels || {},
                        createdAt,
                        size: rawImage.Size,
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

        return images;
    }

    //#endregion

    //#region InspectImages Command

    // protected override async parseInspectImagesCommandOutput(options: InspectImagesCommandOptions, output: string, strict: boolean): Promise<InspectImagesItem[]> {
    //     const images = new Array<InspectImagesItem>();
    //     try {

    //     } catch (err) {
    //         if (strict) {
    //             throw err;
    //         }
    //     }

    //     return images;
    // }

    //#endregion

    //#region ListContainers Command

    protected override async parseListContainersCommandOutput(options: ListContainersCommandOptions, output: string, strict: boolean): Promise<ListContainersItem[]> {
        const containers = new Array<ListContainersItem>();
        try {
            const rawContainers = JSON.parse(output);
            rawContainers.forEach((rawContainer: unknown) => {
                try {
                    if (!isPodmanListContainerRecord(rawContainer)) {
                        throw new Error('Invalid image JSON');
                    }

                    const name = rawContainer.Names?.[0].trim();
                    const createdAt = dayjs.unix(rawContainer.Created).toDate();
                    const ports: PortBinding[] = (rawContainer.Ports || []).map(p => {
                        return {
                            containerPort: p.container_port,
                            hostIp: p.host_ip,
                            hostPort: p.host_port,
                            protocol: p.protocol,
                        };
                    });

                    containers.push({
                        id: rawContainer.Id,
                        image: parseDockerLikeImageName(rawContainer.Image),
                        name,
                        labels: rawContainer.Labels || {},
                        createdAt,
                        ports,
                        networks: rawContainer.Networks || [],
                        state: rawContainer.State,
                        status: rawContainer.Status,
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

        return containers;
    }

    //#endregion

    //#region ListVolumes Command

    protected override async parseListVolumesCommandOputput(options: ListVolumesCommandOptions, output: string, strict: boolean): Promise<ListVolumeItem[]> {
        const volumes = new Array<ListVolumeItem>();
        try {
            const rawVolumes = JSON.parse(output);
            rawVolumes.forEach((volumeJson: string) => {
                try {
                    if (!volumeJson && typeof volumeJson !== 'string') {
                        return;
                    }

                    const rawVolume = JSON.parse(volumeJson);

                    if (!isPodmanVolumeRecord(rawVolume)) {
                        throw new Error('Invalid volume JSON');
                    }

                    volumes.push({
                        name: rawVolume.Name,
                        driver: rawVolume.Driver,
                        labels: rawVolume.Labels,
                        mountpoint: rawVolume.Mountpoint,
                        scope: rawVolume.Scope,
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

        return volumes;
    }

    //#endregion
}
