/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dayjs from 'dayjs';
import * as customParseFormat from 'dayjs/plugin/customParseFormat';
import * as utc from 'dayjs/plugin/utc';
import { CommandResponse } from '../../contracts/CommandRunner';
import {
    BuildImageCommandOptions,
    CreateVolumeCommandOptions,
    ExecContainerCommandOptions,
    IContainersClient,
    InspectContainersCommandOptions,
    InspectContainersItem,
    InspectContainersItemMount,
    InspectContainersItemNetwork,
    InspectImagesCommandOptions,
    InspectImagesItem,
    Labels,
    ListContainersCommandOptions,
    ListContainersItem,
    ListImagesCommandOptions,
    ListImagesItem,
    ListVolumeItem,
    ListVolumesCommandOptions,
    LogsForContainerCommandOptions,
    PortBinding,
    PruneImagesCommandOptions,
    PruneImagesItem,
    PullImageCommandOptions,
    RemoveContainersCommandOptions,
    RemoveVolumesCommandOptions,
    RunContainerCommandOptions,
    StopContainersCommandOptions,
    TagImageCommandOptions,
    VersionCommandOptions,
    VersionItem
} from "../../contracts/ContainerClient";
import {
    CommandLineArgs,
    composeArgs,
    quoted,
    withArg,
    withFlagArg,
    withNamedArg,
} from "../../utils/commandLineBuilder";
import { getString } from '../../utils/streamUtils';
import { toArray } from '../../utils/toArray';
import { DockerInspectContainerRecord, isDockerInspectContainerRecord } from './DockerInspectContainerRecord';
import { DockerInspectImageRecord, isDockerInspectImageRecord } from './DockerInspectImageRecord';
import { DockerListContainerRecord, isDockerListContainerRecord } from './DockerListContainerRecord';
import { isDockerListImageRecord } from "./DockerListImageRecord";
import { isDockerVersionRecord } from "./DockerVersionRecord";
import { isDockerVolumeRecord } from './DockerVolumeRecord';
import { goTemplateJsonFormat, GoTemplateJsonFormatOptions, goTemplateJsonProperty } from './goTemplateJsonFormat';
import { parseDockerImageRepository } from "./parseDockerImageRepository";
import { parseDockerRawPortString } from './parseDockerRawPortString';
import { withDockerEnvArg } from './withDockerEnvArg';
import { withDockerJsonFormatArg } from "./withDockerJsonFormatArg";
import { withDockerLabelFilterArgs } from "./withDockerLabelFilterArgs";
import { withDockerLabelsArg } from "./withDockerLabelsArg";
import { withDockerMountsArg } from './withDockerMountsArg';
import { withDockerNoTruncArg } from "./withDockerNoTruncArg";
import { withDockerPortsArg } from './withDockerPortsArg';

dayjs.extend(customParseFormat);
dayjs.extend(utc);

// @ts-expect-error TODO: It doesn't fully implement the interface right now
export abstract class DockerLikeClient implements IContainersClient {
    abstract readonly id: string;
    abstract readonly displayName: string;
    abstract readonly description: string;
    abstract readonly commandName: string;
    listDateFormat: string = 'YYYY-MM-DD HH:mm:ss ZZ';

    //#region Version Command

    /**
     * Get the command line arguments for a Docker-like client version command
     * @param options Standard version command options
     * @returns Command line args for getting version information from a Docker-like client
     */
    protected getVersionCommandArgs(options?: VersionCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('version'),
            withDockerJsonFormatArg,
        )();
    }

    /**
     * Parse/normalize the output from running a Docker-like client version command
     * @param stdOut The {@link NodeJS.ReadableStream} for the output from the command
     * @param stdErr The {@link NodeJS.ReadableStream} for the error output from the command
     * @param strict Use strict parsing to validate the command?
     * @returns
     */
    protected async parseVersionCommandOutput(
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean
    ): Promise<VersionItem> {
        const output = await getString(stdOut);
        const version = JSON.parse(output);
        if (!isDockerVersionRecord(version)) {
            throw new Error('Invalid version JSON');
        }

        return {
            client: version.Client.ApiVersion,
            server: version.Server.ApiVersion,
        };
    }

    /**
     * Version command implementation for Docker-like clients
     * @param options Standard version command options
     * @returns A CommandResponse object indicating how to run and parse a version command for this runtime
     */
    async version(options?: VersionCommandOptions): Promise<CommandResponse<VersionItem>> {
        return {
            command: this.commandName,
            args: this.getVersionCommandArgs(options),
            parse: this.parseVersionCommandOutput,
        };
    }

    //#endregion

    //#region Image Commands

    //#region BuildImage Command

    /**
     * Get build image command arguments for the current runtime
     * @param options Standard build image command options
     * @returns Command line args for running a build image command on the current runtime
     */
    protected getBuildImageCommandArgs(options: BuildImageCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('image', 'build'),
            withFlagArg('--pull', options.pull),
            withNamedArg('--file', options.file),
            withNamedArg('--target', options.stage),
            withNamedArg('--tag', options.tags),
            withNamedArg(
                '--disable-content-trust',
                typeof options.disableContentTrust === 'boolean'
                    ? options.disableContentTrust.toString()
                    : options.disableContentTrust),
            withDockerLabelsArg(options.labels),
            withNamedArg('--iidfile', options.imageIdFile),
            withNamedArg('--build-arg', options.args),
            withArg(quoted(options.path)),
        )();
    }

    /**
     * Parse the build image command standard out
     * @param options Build image command options
     * @param stdOut The {@link NodeJS.ReadableStream} for the output from the command
     * @param stdErr The {@link NodeJS.ReadableStream} for the error output from the command
     * @param strict Should the output be strictly parsed?
     * @returns An empty promise
     */
    protected parseBuildImageCommandOutput(
        options: BuildImageCommandOptions,
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean,
    ): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Implements the build image command for a Docker-like runtime
     * @param options Standard build image command options
     * @returns A CommandResponse object that can be used to invoke and parse the build image command for the current runtime
     */
    async buildImage(options: BuildImageCommandOptions): Promise<CommandResponse<void>> {
        return {
            command: this.commandName,
            args: this.getBuildImageCommandArgs(options),
            parse: (stdOut, stdErr, strict) => this.parseBuildImageCommandOutput(options, stdOut, stdErr, strict),
        };
    }

    //#endregion

    //#region ListImages Command

    /**
     * Get list images command arguments for the current runtime
     * @param options The process that runs the list images command for a given runtime
     * @returns Command line args for running a list image command on the current runtime
     */
    protected getListImagesCommandArgs(options: ListImagesCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('image', 'ls'),
            withFlagArg('--all', options.all),
            withNamedArg(
                '--filter',
                typeof options.dangling === 'boolean'
                    ? `dangling=${options.dangling}`
                    : undefined),
            withNamedArg('--filter', options.references?.map((reference) => `reference=${reference}`)),
            withDockerLabelFilterArgs(options.labels),
            withDockerNoTruncArg,
            withDockerJsonFormatArg,
        )();
    }

    /**
     * Parse and normalize the standard out from a Docker-like list images command
     * @param options List images command options
     * @param stdOut The {@link NodeJS.ReadableStream} for the output from the command
     * @param stdErr The {@link NodeJS.ReadableStream} for the error output from the command
     * @param strict Should the output be strictly parsed?
     * @returns A normalized array of ListImagesItem records
     */
    protected async parseListImagesCommandOutput(
        options: ListImagesCommandOptions,
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean,
    ): Promise<Array<ListImagesItem>> {
        const output = await getString(stdOut);
        const images = new Array<ListImagesItem>();
        try {
            // Docker returns JSON per-line output, so we need to split each line
            // and parse as independent JSON objects
            output.split("\n").forEach((imageJson) => {
                try {
                    // Ignore empty lines when parsing
                    if (!imageJson) {
                        return;
                    }

                    const rawImage = JSON.parse(imageJson);

                    // Validate that the image object matches the expected output
                    // for the list images command
                    if (!isDockerListImageRecord(rawImage)) {
                        throw new Error('Invalid image JSON');
                    }

                    // Parse the docker image to normalize registry, image name,
                    // and image tag information
                    const [registry, imageName] = parseDockerImageRepository(rawImage.Repository);
                    const createdAt = dayjs.utc(rawImage.CreatedAt).toDate();

                    // Combine the image components into a standardized full name
                    const image = registry ? `${registry}/${imageName}:${rawImage.Tag}` : `${imageName}:${rawImage.Tag}`;

                    images.push({
                        id: rawImage.ID,
                        image,
                        registry,
                        name: imageName,
                        tag: rawImage.Tag,
                        createdAt,
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

    /**
     * Generates the necessary information for running and parsing the results
     * of a list image command for a Docker-like client
     * @param options Standard list images command options
     * @returns A CommandResponse indicating how to run and parse/normalize a list image command for a Docker-like client
     */
    async listImages(options: ListImagesCommandOptions): Promise<CommandResponse<Array<ListImagesItem>>> {
        return {
            command: this.commandName,
            args: this.getListImagesCommandArgs(options),
            parse: (stdOut, stdErr, strict) => this.parseListImagesCommandOutput(options, stdOut, stdErr, strict),
        };
    }

    //#endregion

    //#region PruneImages Command

    protected getPruneImagesCommandArgs(options: PruneImagesCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('image', 'prune'),
            withArg('--force'),
            withFlagArg('--all', options.all),
        )();
    }

    protected parsePruneImagesCommandOutput(
        options: PruneImagesCommandOptions,
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean,
    ): Promise<PruneImagesItem> {
        // TODO: support return of the optional prune information?
        return Promise.resolve({});
    }

    async pruneImages(options: PruneImagesCommandOptions): Promise<CommandResponse<PruneImagesItem>> {
        return {
            command: this.commandName,
            args: this.getPruneImagesCommandArgs(options),
            parse: (stdOut, stdErr, strict) => this.parsePruneImagesCommandOutput(options, stdOut, stdErr, strict),
        };
    }

    //#endregion

    //#region PullImage Command

    /**
     * Generate the command line arguments for invoking a pull image command on
     * a Docker-like client
     * @param options Pull image command options
     * @returns Command line arguments for pulling a container image
     */
    protected getPullImageCommandArgs(options: PullImageCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('image', 'pull'),
            withFlagArg('--all-tags', options.allTags),
            withNamedArg(
                '--disable-content-trust',
                typeof options.disableContentTrust === 'boolean'
                    ? options.disableContentTrust.toString()
                    : undefined),
            withArg(options.image),
        )();
    }

    protected parsePullImageCommandOutput(
        options: PullImageCommandOptions,
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean,
    ): Promise<void> {
        return Promise.resolve();
    }

    async pullImage(options: PullImageCommandOptions): Promise<CommandResponse<void>> {
        return {
            command: this.commandName,
            args: this.getPullImageCommandArgs(options),
            parse: (stdOut, stdErr, strict) => this.parsePullImageCommandOutput(options, stdOut, stdErr, strict),
        };
    }

    //#endregion

    //#region TagImage Command

    protected getTagImageCommandArgs(options: TagImageCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('image', 'tag'),
            withArg(options.fromImage, options.toImage),
        )();
    }

    protected parseTagImageCommandOutput(
        options: TagImageCommandOptions,
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean,
    ): Promise<void> {
        return Promise.resolve();
    }

    async tagImage(options: TagImageCommandOptions): Promise<CommandResponse<void>> {
        return {
            command: this.commandName,
            args: this.getTagImageCommandArgs(options),
            parse: (stdOut, stdErr, strict) => this.parseTagImageCommandOutput(options, stdOut, stdErr, strict),
        };
    }

    //#endregion

    //#region InspectImages Command

    /**
     * Generate the command line arguments to run an inspect images command on a
     * Docker-like client
     * @param options Standard inspect images options
     * @returns Command line args to run an inspect images command on a given Docker-like client
     */
    protected getInspectImagesCommandArgs(
        options: InspectImagesCommandOptions,
        formatOverrides?: Partial<GoTemplateJsonFormatOptions<DockerInspectImageRecord>>,
    ): CommandLineArgs {
        return composeArgs(
            withArg('image', 'inspect'),
            withNamedArg(
                '--format',
                // By specifying an explicit Go template format output, we're able to use the same normalization logic
                // for both Docker and Podman clients
                goTemplateJsonFormat<DockerInspectImageRecord>({
                    Id: goTemplateJsonProperty`.ID`,
                    RepoTags: goTemplateJsonProperty`.RepoTags`,
                    EnvVars: goTemplateJsonProperty`.Config.Env`,
                    Labels: goTemplateJsonProperty`.Config.Labels`,
                    Ports: goTemplateJsonProperty`.Config.ExposedPorts`,
                    Volumes: goTemplateJsonProperty`.Config.Volumes`,
                    Entrypoint: goTemplateJsonProperty`.Config.Entrypoint`,
                    Command: goTemplateJsonProperty`.Config.Cmd`,
                    CWD: goTemplateJsonProperty`.Config.WorkingDir`,
                    RepoDigests: goTemplateJsonProperty`.RepoDigests`,
                    Architecture: goTemplateJsonProperty`.Architecture`,
                    OperatingSystem: goTemplateJsonProperty`.Os`,
                    CreatedAt: goTemplateJsonProperty`.Created`,
                    Raw: goTemplateJsonProperty`.`,
                }, formatOverrides)),
            withArg(...options.images),
        )();
    }

    /**
     * Parse the standard output from a Docker-like inspect images command and
     * normalize the result
     * @param options Inspect images command options
     * @param stdOut The {@link NodeJS.ReadableStream} for the output from the command
     * @param stdErr The {@link NodeJS.ReadableStream} for the error output from the command
     * @param strict Should strict parsing be enforced?
     * @returns Normalized array of InspectImagesItem records
     */
    protected async parseInspectImagesCommandOutput(
        options: InspectImagesCommandOptions,
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean,
    ): Promise<Array<InspectImagesItem>> {
        const output = await getString(stdOut);
        try {
            return output.split('\n').reduce<Array<InspectImagesItem>>((images, inspectString) => {
                if (!inspectString) {
                    return images;
                }

                try {
                    const inspect = JSON.parse(inspectString);

                    if (!isDockerInspectImageRecord(inspect)) {
                        throw new Error('Invalid image inspect json');
                    }

                    // This is effectively doing firstOrDefault on the RepoTags for the image. If there are any values
                    // in RepoTags, the first one will be parsed and returned as the tag name for the image. Otherwise
                    // if there are no entries in RepoTags, undefined will be returned for the registry, imageName, and
                    // tagName components and the image can be treated as an intermediate/anonymous image layer.
                    const [registry, imageName, tagName] = inspect.RepoTags
                        .slice(0, 1)
                        .reduce<[string | undefined, string | undefined, string | undefined]>((unused, repoTag) => {
                            return parseDockerImageRepository(repoTag);
                        }, [undefined, undefined, undefined]);

                    const fullImage = imageName ? registry ? `${registry}/${imageName}:${tagName}` : `${imageName}:${tagName}` : undefined;

                    // Parse any environment variables defined for the image
                    const environmentVariables = (inspect.EnvVars || []).reduce<Record<string, string>>((evs, ev) => {
                        const index = ev.indexOf('=');
                        if (index > -1) {
                            const name = ev.slice(0, index);
                            const value = ev.slice(index + 1);

                            return {
                                ...evs,
                                [name]: value,
                            };
                        }

                        return evs;
                    }, {});

                    // Parse any default ports exposed by the image
                    const ports = Object.entries(inspect.Ports || {}).map<PortBinding>(([rawPort]) => {
                        const [port, protocol] = rawPort.split('/');
                        return {
                            containerPort: parseInt(port),
                            protocol: protocol.toLowerCase() === 'tcp' ? 'tcp' : protocol.toLowerCase() === 'udp' ? 'udp' : undefined,
                        };
                    });

                    // Parse any default volumes specified by the image
                    const volumes = Object.entries(inspect.Volumes || {}).map<string>(([rawVolume]) => rawVolume);

                    // Parse any labels assigned to the image
                    const labels = inspect.Labels ?? {};

                    // Parse and normalize the image architecture
                    const architecture = inspect.Architecture.toLowerCase() === 'amd64'
                        ? 'amd64'
                        : inspect.Architecture.toLowerCase() === 'arm64' ? 'arm64' : undefined;

                    // Parse and normalize the image OS
                    const os = inspect.OperatingSystem.toLowerCase() === 'linux'
                        ? 'linux'
                        : inspect.Architecture.toLowerCase() === 'windows'
                            ? 'windows'
                            : undefined;

                    // Determine if the image has been pushed to a remote repo
                    // (no repo digests or only localhost/ repo digetss)
                    const isLocalImage = !(inspect.RepoDigests || []).some((digest) => !digest.toLowerCase().startsWith('localhost/'));

                    // Return a normalized InspectImagesItem record
                    const image: InspectImagesItem = {
                        id: inspect.Id,
                        name: imageName,
                        tag: tagName,
                        registry: registry,
                        image: fullImage,
                        isLocalImage,
                        environmentVariables,
                        ports,
                        volumes,
                        labels,
                        entrypoint: inspect.Entrypoint,
                        command: inspect.Command,
                        currentDirectory: inspect.CWD || undefined,
                        architecture,
                        operatingSystem: os,
                        createdAt: dayjs.utc(inspect.CreatedAt).toDate(),
                        raw: JSON.stringify(inspect.Raw),
                    };

                    return [...images, image];
                } catch (err) {
                    if (strict) {
                        throw err;
                    }
                }

                return images;
            }, new Array<InspectImagesItem>());
        } catch (err) {
            if (strict) {
                throw err;
            }
        }

        // If there were no image records or there was a parsing error but
        // strict parsing was disabled, return an empty array
        return new Array<InspectImagesItem>();
    }

    async inspectImages(options: InspectImagesCommandOptions): Promise<CommandResponse<Array<InspectImagesItem>>> {
        return {
            command: this.commandName,
            args: this.getInspectImagesCommandArgs(options),
            parse: (stdOut, stdErr, strict) => this.parseInspectImagesCommandOutput(options, stdOut, stdErr, strict),
        };
    }

    //#endregion

    //#endregion

    //#region Container Commands

    //#region RunContainer Command

    /**
     * Generate the command line arguments for a Docker-like run container
     * command
     * @param options Standard run container options
     * @returns Command line arguments for a Docker-like run container command
     */
    protected getRunContainerCommandArgs(options: RunContainerCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('container', 'run'),
            withFlagArg('--detach', options.detached),
            withFlagArg('--tty', options.detached),
            withFlagArg('--rm', options.removeOnExit),
            withNamedArg('--name', options.name),
            withDockerPortsArg(options.ports),
            withFlagArg('--publish-all', options.publishAllPorts),
            withDockerMountsArg(options.mounts),
            withDockerLabelsArg(options.labels),
            withDockerEnvArg(options.environmentVariables),
            withNamedArg('--entrypoint', options.entrypoint),
            withArg(options.image),
            withArg(...(toArray(options.command || []))),
        )();
    }

    /**
     * Parse standard output for a run container command
     * @param options The standard run container command options
     * @param stdOut The {@link NodeJS.ReadableStream} for the output from the command
     * @param stdErr The {@link NodeJS.ReadableStream} for the error output from the command
     * @param strict Should strict parsing be enforced
     * @returns The container ID if running detached or standard out if running attached
     */
    protected async parseRunContainerCommandOutput(
        options: RunContainerCommandOptions,
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean,
    ): Promise<string | undefined> {
        const output = await getString(stdOut);
        return options.detached ? output.split('\n', 1)[0] : output;
    }

    /**
     * Generate a CommandResponse for a Docker-like run container command that includes how to run and parse command output
     * @param options Standard run container command options
     * @returns A CommandResponse object for a Docker-like run container command
     */
    async runContainer(options: RunContainerCommandOptions): Promise<CommandResponse<string | undefined>> {
        return {
            command: this.commandName,
            args: this.getRunContainerCommandArgs(options),
            parse: (stdOut, stdErr, strict) => this.parseRunContainerCommandOutput(options, stdOut, stdErr, strict),
        };
    }

    //#endregion

    //#region ExecContainer Command

    protected getExecContainerCommandArgs(options: ExecContainerCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('container', 'exec'),
            withFlagArg('--interactive', options.interactive),
            withFlagArg('--detached', options.detached),
            withFlagArg('--tty', options.tty),
            withDockerEnvArg(options.environmentVariables),
            withArg(options.container),
            withArg(...toArray(options.command)),
        )();
    }

    protected parseExecContainerCommandOutput(
        options: ExecContainerCommandOptions,
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean,
    ): Promise<NodeJS.ReadableStream> {
        return Promise.resolve(stdOut);
    }

    async execContainer(options: ExecContainerCommandOptions): Promise<CommandResponse<NodeJS.ReadableStream>> {
        return {
            command: this.commandName,
            args: this.getExecContainerCommandArgs(options),
            parse: (stdOut, stdErr, strict) => this.parseExecContainerCommandOutput(options, stdOut, stdErr, strict),
        };
    }

    //#endregion

    //#region ListContainers Command

    protected getListContainersCommandArgsCore(
        options: ListContainersCommandOptions,
        formatOverrides?: Partial<GoTemplateJsonFormatOptions<DockerListContainerRecord>>,
    ): CommandLineArgs {
        return composeArgs(
            withArg('container', 'ls'),
            withFlagArg('--all', options.all),
            withDockerLabelFilterArgs(options.labels),
            withNamedArg('--filter', options.running ? 'status=running' : undefined),
            withNamedArg('--filter', options.exited ? 'status=exited' : undefined),
            withNamedArg('--filter', options.names?.map((name) => `name=${name}`)),
            withDockerNoTruncArg,
            withNamedArg(
                '--format',
                goTemplateJsonFormat<DockerListContainerRecord>({
                    Id: goTemplateJsonProperty`.ID`,
                    Names: goTemplateJsonProperty`.Names`,
                    Image: goTemplateJsonProperty`.Image`,
                    Ports: goTemplateJsonProperty`.Ports`,
                    CreatedAt: goTemplateJsonProperty`.CreatedAt`
                }, formatOverrides)),
        )();
    }

    protected getListContainersCommandArgs(options: ListContainersCommandOptions) {
        return this.getListContainersCommandArgsCore(options);
    }

    protected async parseListContainersCommandOutput(
        options: ListContainersCommandOptions,
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean,
    ): Promise<Array<ListContainersItem>> {
        const output = await getString(stdOut);
        const containers = new Array<ListContainersItem>();
        try {
            output.split('\n').forEach((containerJson) => {
                try {
                    if (!containerJson) {
                        return;
                    }

                    const rawContainer = JSON.parse(containerJson);

                    if (!isDockerListContainerRecord(rawContainer)) {
                        throw new Error('Invalid container JSON');
                    }

                    const ports = rawContainer.Ports
                        .split(',')
                        .map((port) => port.trim())
                        .filter((port) => !!port)
                        .reduce<Array<PortBinding>>((portBindings, rawPort) => {
                            const parsedPort = parseDockerRawPortString(rawPort);
                            if (parsedPort) {
                                return portBindings.concat(parsedPort);
                            } else if (strict) {
                                throw new Error('Invalid container JSON');
                            } else {
                                return portBindings;
                            }
                        }, []);

                    const name = rawContainer.Names.split(',')[0].trim();
                    const createdAt = dayjs.utc(rawContainer.CreatedAt, this.listDateFormat).toDate();

                    containers.push({
                        id: rawContainer.Id,
                        name,
                        image: rawContainer.Image,
                        ports,
                        createdAt,
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

    async listContainers(options: ListContainersCommandOptions): Promise<CommandResponse<Array<ListContainersItem>>> {
        return {
            command: this.commandName,
            args: this.getListContainersCommandArgs(options),
            parse: (stdOut, stdErr, strict) => this.parseListContainersCommandOutput(options, stdOut, stdErr, strict),
        };
    }

    //#endregion

    //#region StopContainers Command

    /**
     * Generate command line arguments for running a stop container command
     * @param options Standard stop container command options
     * @returns The command line arguments required to run the stop container command on a Docker-like runtime
     */
    protected getStopContainersCommandArgs(options: StopContainersCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('container', 'stop'),
            withNamedArg('--time', typeof options.time === 'number' ? options.time.toString() : undefined),
            withArg(...toArray(options.container)),
        )();
    }

    /**
     * Parse the standard output from running a stop container command on a Docker-like runtime
     * @param options Stop container command options
     * @param stdOut The {@link NodeJS.ReadableStream} for the output from the command
     * @param stdErr The {@link NodeJS.ReadableStream} for the error output from the command
     * @param strict Should strict parsing be enforced
     * @returns A list of IDs for containers that were stopped
     */
    protected async parseStopContainersCommandOutput(
        options: StopContainersCommandOptions,
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean,
    ): Promise<Array<string>> {
        const output = await getString(stdOut);
        return output.split('\n').filter((id) => id);
    }

    async stopContainers(options: StopContainersCommandOptions): Promise<CommandResponse<Array<string>>> {
        return {
            command: this.commandName,
            args: this.getStopContainersCommandArgs(options),
            parse: (stdOut, stdErr, strict) => this.parseStopContainersCommandOutput(options, stdOut, stdErr, strict),
        };
    }

    //#endregion

    //#region RemoveContainers Command

    protected getRemoveContainersCommandArgs(options: RemoveContainersCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('container', 'rm'),
            withFlagArg('--force', options.force),
            withArg(...options.containers),
        )();
    }

    protected async parseRemoveContainersCommandOutput(
        options: RemoveContainersCommandOptions,
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean,
    ): Promise<Array<string>> {
        const output = await getString(stdOut);
        return output.split('\n').filter((id) => id);
    }

    async removeContainers(options: RemoveContainersCommandOptions): Promise<CommandResponse<Array<string>>> {
        return {
            command: this.commandName,
            args: this.getRemoveContainersCommandArgs(options),
            parse: (stdOut, stdErr, strict) => this.parseRemoveContainersCommandOutput(options, stdOut, stdErr, strict),
        };
    }

    //#endregion

    //#region LogsForContainer Command

    /**
     * Generate the command line arguments for the log container command on a
     * Docker-like client
     * @param options Options for log container command
     * @returns Command line arguments to invoke a log container command on a Docker-like client
     */
    protected getLogsForContainerCommandArgs(options: LogsForContainerCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('container', 'logs'),
            withFlagArg('--follow', options.follow),
            withFlagArg('--timestamps', options.timestamps),
            withNamedArg('--tail', options.tail?.toString()),
            withNamedArg('--since', options.since),
            withNamedArg('--until', options.until),
            withArg(options.container),
        )();
    }

    /**
     * Parse the standard out from running a log container command on a
     * Docker-like client
     * @param options Options for the log container command
     * @param stdOut The {@link NodeJS.ReadableStream} for the output from the command
     * @param stdErr The {@link NodeJS.ReadableStream} for the error output from the command
     * @param strict Should strict parsing be used?
     * @returns An empty promise
     */
    protected parseLogsForContainerCommandOutput(
        options: LogsForContainerCommandOptions,
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean,
    ): Promise<NodeJS.ReadableStream> {
        return Promise.resolve(stdOut);
    }

    /**
     * Generate a CommandResponse object for a Docker-like log container command
     * @param options Options for the log container command
     * @returns The CommandResponse object for the log container command
     */
    async logsForContainer(options: LogsForContainerCommandOptions): Promise<CommandResponse<NodeJS.ReadableStream>> {
        return {
            command: this.commandName,
            args: this.getLogsForContainerCommandArgs(options),
            parse: (stdOut, stdErr, strict) => this.parseLogsForContainerCommandOutput(options, stdOut, stdErr, strict),
        };
    }

    //#endregion

    //#region InspectContainers Command

    /**
     * Only override this method if you need to make substantial changes to the inspect container commands required for
     * a given runtime
     * @param options Inspect containers command options
     * @param formatOverrides Optional overrides for the Go template JSON mapping
     * @returns Command line args for invoking inspect containers on a Docker-like client
     */
    protected getInspectContainersCommandArgsCore(
        options: InspectContainersCommandOptions,
        formatOverrides?: Partial<GoTemplateJsonFormatOptions<DockerInspectContainerRecord>>,
    ): CommandLineArgs {
        return composeArgs(
            withArg('container', 'inspect'),
            withNamedArg(
                '--format',
                goTemplateJsonFormat<DockerInspectContainerRecord>({
                    Id: goTemplateJsonProperty`.ID`,
                    Name: goTemplateJsonProperty`.Name`,
                    ImageId: goTemplateJsonProperty`.Image`,
                    ImageName: goTemplateJsonProperty`.Config.Image`,
                    Status: goTemplateJsonProperty`.State.Status`,
                    Platform: goTemplateJsonProperty`.Platform`,
                    EnvVars: goTemplateJsonProperty`.Config.Env`,
                    Networks: goTemplateJsonProperty`.NetworkSettings.Networks`,
                    IP: goTemplateJsonProperty`.NetworkSettings.IPAddress`,
                    Ports: goTemplateJsonProperty`.NetworkSettings.Ports`,
                    PublishAllPorts: goTemplateJsonProperty`.HostConfig.PublishAllPorts`,
                    Mounts: goTemplateJsonProperty`.Mounts`,
                    Labels: goTemplateJsonProperty`.Config.Labels`,
                    Entrypoint: goTemplateJsonProperty`.Config.Entrypoint`,
                    Command: goTemplateJsonProperty`.Config.Cmd`,
                    CWD: goTemplateJsonProperty`.Config.WorkingDir`,
                    CreatedAt: goTemplateJsonProperty`.Created`,
                    StartedAt: goTemplateJsonProperty`.State.StartedAt`,
                    FinishedAt: goTemplateJsonProperty`.State.FinishedAt`,
                    Raw: goTemplateJsonProperty`.`,
                }, formatOverrides),
            ),
            withArg(...options.containers)
        )();
    }

    /**
     * Override this method if the default Go Template JSON mappings need to be changed for a given runtime
     * @param options Inspect containers command options
     * @returns Command line args for invoking inspect containers on a Docker-like client
     */
    protected getInspectContainersCommandArgs(options: InspectContainersCommandOptions): CommandLineArgs {
        return this.getInspectContainersCommandArgsCore(options);
    }

    /**
     * Parse the output from running an inspect containers command on a Docker-like client
     * @param options Inspect containers command options
     * @param stdOut The {@link NodeJS.ReadableStream} for the output from the command
     * @param stdErr The {@link NodeJS.ReadableStream} for the error output from the command
     * @param strict Should strict parsing be used to parse the output?
     * @returns An array of InspectContainersItem records
     */
    protected async parseInspectContainersCommandOutput(
        options: InspectContainersCommandOptions,
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean,
    ): Promise<Array<InspectContainersItem>> {
        const output = await getString(stdOut);
        try {
            return output.split('\n').reduce<Array<InspectContainersItem>>((containers, inspectString) => {
                if (!inspectString) {
                    return containers;
                }

                try {
                    const inspect = JSON.parse(inspectString);

                    if (!isDockerInspectContainerRecord(inspect)) {
                        throw new Error('Invalid container inspect json');
                    }

                    // Parse the environment variables assigned to the container at runtime
                    const environmentVariables = (inspect.EnvVars || []).reduce<Record<string, string>>((evs, ev) => {
                        const index = ev.indexOf('=');
                        if (index > -1) {
                            const name = ev.slice(0, index);
                            const value = ev.slice(index + 1);

                            return {
                                ...evs,
                                [name]: value,
                            };
                        }

                        return evs;
                    }, {});

                    // Parse the networks assigned to the container and normalize to InspectContainersItemNetwork
                    // records
                    const networks = Object.entries(inspect.Networks || {}).map<InspectContainersItemNetwork>(([name, dockerNetwork]) => {
                        return {
                            name,
                            gateway: dockerNetwork.Gateway || undefined,
                            ipAddress: dockerNetwork.IPAddress || undefined,
                            macAddress: dockerNetwork.MacAddress || undefined,
                        };
                    });

                    // Parse the exposed ports for the container and normalize to a PortBinding record
                    const ports = Object.entries(inspect.Ports || {}).map<PortBinding>(([rawPort]) => {
                        const [port, protocol] = rawPort.split('/');
                        return {
                            containerPort: parseInt(port),
                            protocol: protocol.toLowerCase() === 'tcp'
                                ? 'tcp'
                                : protocol.toLowerCase() === 'udp'
                                    ? 'udp'
                                    : undefined,
                        };
                    });

                    // Parse the volume and bind mounts associated with the given runtime and normalize to
                    // InspectContainersItemMount records
                    const mounts = (inspect.Mounts || []).reduce<Array<InspectContainersItemMount>>((curMounts, mount) => {
                        switch (mount?.Type) {
                            case 'bind':
                                return [...curMounts, {
                                    type: 'bind',
                                    source: mount.Source,
                                    destination: mount.Destination,
                                    readOnly: !mount.RW,
                                }];
                            case 'volume':
                                return [...curMounts, {
                                    type: 'volume',
                                    name: mount.Name,
                                    source: mount.Source,
                                    destination: mount.Destination,
                                    driver: mount.Driver,
                                    readOnly: !mount.RW,
                                }];
                        }

                    }, new Array<InspectContainersItemMount>());
                    const labels = inspect.Labels ?? {};

                    const createdAt = dayjs.utc(inspect.CreatedAt);
                    const startedAt = inspect.StartedAt
                        ? dayjs.utc(inspect.StartedAt)
                        : undefined;
                    const finishedAt = inspect.FinishedAt
                        ? dayjs.utc(inspect.FinishedAt)
                        : undefined;

                    // Return the normalized InspectContainersItem record
                    const container: InspectContainersItem = {
                        id: inspect.Id,
                        name: inspect.Name,
                        imageId: inspect.ImageId,
                        imageName: inspect.ImageName,
                        status: inspect.Status,
                        environmentVariables,
                        networks,
                        ipAddress: inspect.IP ? inspect.IP : undefined,
                        ports,
                        mounts,
                        labels,
                        entrypoint: toArray(inspect.Entrypoint ?? []),
                        command: toArray(inspect.Command ?? []),
                        currentDirectory: inspect.CWD || undefined,
                        createdAt: createdAt.toDate(),
                        startedAt: startedAt && (startedAt.isSame(createdAt) || startedAt.isAfter(createdAt))
                            ? startedAt.toDate()
                            : undefined,
                        finishedAt: finishedAt && (finishedAt.isSame(createdAt) || finishedAt.isAfter(createdAt))
                            ? finishedAt.toDate()
                            : undefined,
                        raw: JSON.stringify(inspect.Raw),
                    };

                    return [...containers, container];
                } catch (err) {
                    if (strict) {
                        throw err;
                    }
                }

                return containers;
            }, new Array<InspectContainersItem>());
        } catch (err) {
            if (strict) {
                throw err;
            }
        }

        return new Array<InspectContainersItem>();
    }

    async inspectContainers(
        options: InspectContainersCommandOptions,
    ): Promise<CommandResponse<InspectContainersItem[]>> {
        return {
            command: this.commandName,
            args: this.getInspectContainersCommandArgs(options),
            parse: (stdOut, stdErr, strict) => this.parseInspectContainersCommandOutput(options, stdOut, stdErr, strict),
        };
    }

    //#endregion

    //#endregion

    //#region Volume Commands

    //#region CreateVolume Command

    protected getCreateVolumeCommandArgs(options: CreateVolumeCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('volume', 'create'),
            withNamedArg('--driver', options.driver),
            withArg(options.name),
            withDockerJsonFormatArg,
        )();
    }

    protected parseCreateVolumeCommandOutput(
        options: CreateVolumeCommandOptions,
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean,
    ): Promise<void> {
        return Promise.resolve();
    }

    async createVolume(options: CreateVolumeCommandOptions): Promise<CommandResponse<void>> {
        return {
            command: this.commandName,
            args: this.getCreateVolumeCommandArgs(options),
            parse: (stdOut, stdErr, strict) => this.parseCreateVolumeCommandOutput(options, stdOut, stdErr, strict),
        };
    }

    //#endregion

    //#region ListVolumes Command

    protected getListVolumesCommandArgs(options: ListVolumesCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('volume', 'ls'),
            withNamedArg(
                '--filter',
                typeof options.dangling === 'boolean'
                    ? `dangling=${options.dangling}`
                    : undefined),
            withNamedArg(
                '--filter',
                options.driver
                    ? `driver=${options.driver}`
                    : undefined),
            withDockerLabelFilterArgs(options.labels),
            withDockerJsonFormatArg,
        )();
    }

    protected async parseListVolumesCommandOputput(
        options: ListVolumesCommandOptions,
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean,
    ): Promise<ListVolumeItem[]> {
        const output = await getString(stdOut);
        const volumes = new Array<ListVolumeItem>();
        try {
            output.split("\n").forEach((volumeJson) => {
                try {
                    if (!volumeJson) {
                        return;
                    }

                    const rawVolume = JSON.parse(volumeJson);

                    if (!isDockerVolumeRecord(rawVolume)) {
                        throw new Error('Invalid volume JSON');
                    }

                    // Parse the labels assigned tot he volumes and normalize to key value pairs
                    const labels = rawVolume.Labels.split(',').reduce((labels, labelPair) => {
                        const index = labelPair.indexOf('=');
                        labels[labelPair.substring(0, index)] = labelPair.substring(index + 1);
                        return labels;
                    }, {} as Labels);

                    volumes.push({
                        name: rawVolume.Name,
                        driver: rawVolume.Driver,
                        labels,
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

    async listVolumes(options: ListVolumesCommandOptions): Promise<CommandResponse<ListVolumeItem[]>> {
        return {
            command: this.commandName,
            args: this.getListVolumesCommandArgs(options),
            parse: (stdOut, stdErr, strict) => this.parseListVolumesCommandOputput(options, stdOut, stdErr, strict),
        };
    }

    //#endregion

    //#region RemoveVolumes Command

    /**
     * Generate the command line arguments for a Docker-like remove volumes
     * command
     * @param options Remove volumes command options
     * @returns Command line arguments for invoking a remove volumes command
     */
    protected getRemoveVolumesCommandArgs(options: RemoveVolumesCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('volume', 'rm'),
            withFlagArg('--force', options.force),
            withArg(...options.volumes),
        )();
    }

    /**
     * Parse the output from running a Docker-like remove volumes command
     * @param options Options for the remove volumes command
     * @param stdOut The {@link NodeJS.ReadableStream} for the output from the command
     * @param stdErr The {@link NodeJS.ReadableStream} for the error output from the command
     * @param strict Should strict parsing be enforced?
     * @returns A list of IDs for the volumes removed
     */
    protected async parseRemoveVolumesCommandOutput(
        options: RemoveVolumesCommandOptions,
        stdOut: NodeJS.ReadableStream,
        stdErr: NodeJS.ReadableStream,
        strict: boolean,
    ): Promise<string[]> {
        const output = await getString(stdOut);
        return output.split('\n').filter(id => id);
    }

    /**
     * Generate a CommandResponse instance for a Docker-like remove volumes
     * command
     * @param options Options for remove volumes command
     * @returns CommandResponse for the remove volumes command
     */
    async removeVolumes(options: RemoveVolumesCommandOptions): Promise<CommandResponse<string[]>> {
        return {
            command: this.commandName,
            args: this.getRemoveVolumesCommandArgs(options),
            parse: (stdOut, stdErr, strict) => this.parseRemoveVolumesCommandOutput(options, stdOut, stdErr, strict),
        };
    }

    //#endregion

    //#endregion
}
