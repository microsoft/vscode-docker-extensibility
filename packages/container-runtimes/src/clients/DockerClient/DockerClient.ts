/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IContainersClient } from "../../contracts/ContainerClient";
import { DockerLikeClient } from "../DockerLikeClient/DockerLikeClient";

// @ts-expect-error TODO: It doesn't fully implement the interface right now
export class DockerClient extends DockerLikeClient implements IContainersClient {
    /**
     * Constructs a new {@link DockerClient}
     * @param commandName (Optional, default `docker`) The command that will be run
     * as the base command. If quoting is necessary, it is the responsibility of the
     * caller to add.
     * @param displayName (Optional, default 'Docker') The human-friendly display
     * name of the client
     * @param description (Optional, with default) The human-friendly description of
     * the client
     */
    public constructor(
        commandName: string = 'docker',
        displayName: string = 'Docker',
        description: string = 'Runs container commands using the Docker CLI'
    ) {
        super(
            'com.microsoft.visualstudio.containers.docker',
            commandName,
            displayName,
            description
        );
    }
}
