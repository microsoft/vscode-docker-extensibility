/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IContainerOrchestratorClient } from '../../contracts/ContainerOrchestratorClient';
import { DockerComposeClientBase } from '../DockerComposeClientBase/DockerComposeClientBase';

export class NerdctlComposeClient extends DockerComposeClientBase implements IContainerOrchestratorClient {
    /**
     * The ID of the Nerdctl Compose client
     */
    public static ClientId = 'com.microsoft.visualstudio.orchestrators.nerdctlcompose';

    /**
     * Constructs a new {@link NerdctlComposeClient}
     * @param commandName (Optional, default `nerdctl`) The command that will be run
     * as the base command. If quoting is necessary, it is the responsibility of the
     * caller to add.
     * @param displayName (Optional, default 'Nerdctl Compose') The human-friendly display
     * name of the client
     * @param description (Optional, with default) The human-friendly description of
     * the client
     * @param composeV2 (Optional, default `true`) If true, `compose` will be added as the
     * first argument to all commands. The base command should be `nerdctl`.
     */
    public constructor(
        commandName: string = 'nerdctl',
        displayName: string = 'Nerdctl Compose',
        description: string = 'Runs orchestrator commands using the Nerdctl Compose CLI',
        composeV2: boolean = true
    ) {
        super(
            NerdctlComposeClient.ClientId,
            commandName,
            displayName,
            description
        );

        // Nerdctl always uses the V2 compose syntax (nerdctl compose <command>)
        this.composeV2 = composeV2;
    }
}
