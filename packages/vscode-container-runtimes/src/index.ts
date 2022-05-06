/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { DockerClient } from './clients/DockerClient';
import { PodmanClient } from './clients/PodmanClient';
import { shellCommandRunnerAsync } from './commandRunners/shell';
import { wslCommandRunnerAsync } from './commandRunners/wsl';
import {
    BuildImageCommandOptions,
    ClientIdentity,
    CommandResponse,
    CreateVolumeCommandOptions,
    ExecContainerCommandOptions,
    IContainersClient,
    ListContainersItem,
    ListContainersCommandOptions,
    ListImagesItem,
    ListImagesCommandOptions,
    ListVolumeItem,
    ListVolumesCommandOptions,
    PruneImagesCommandOptions,
    PullImageCommandOptions,
    RemoveContainersCommandOptions,
    RemoveVolumesCommandOptions,
    RunContainerCommandOptions,
    StopContainersCommandOptions,
    TagImageCommandOptions,
    VersionCommandOptions,
    VersionItem,
    InspectImagesCommandOptions,
    InspectImagesItem,
    InspectContainersCommandOptions,
    InspectContainersItem,
    LogsForContainerCommandOptions,
} from './contracts/ContainerClient';
import { ChildProcessError } from './utils/ChildProcessError';
import { powershellQuote } from './utils/spawnAsync';

export {
    BuildImageCommandOptions,
    ChildProcessError,
    ClientIdentity,
    CommandResponse,
    CreateVolumeCommandOptions,
    DockerClient,
    ExecContainerCommandOptions,
    IContainersClient,
    InspectImagesCommandOptions,
    InspectImagesItem,
    InspectContainersCommandOptions,
    InspectContainersItem,
    ListContainersItem,
    ListContainersCommandOptions,
    ListImagesItem,
    ListImagesCommandOptions,
    ListVolumeItem,
    ListVolumesCommandOptions,
    LogsForContainerCommandOptions,
    PodmanClient,
    powershellQuote,
    PruneImagesCommandOptions,
    PullImageCommandOptions,
    RemoveContainersCommandOptions,
    RemoveVolumesCommandOptions,
    RunContainerCommandOptions,
    shellCommandRunnerAsync,
    StopContainersCommandOptions,
    TagImageCommandOptions,
    VersionCommandOptions,
    VersionItem,
    wslCommandRunnerAsync,
};
