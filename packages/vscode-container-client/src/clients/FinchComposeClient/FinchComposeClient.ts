/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IContainerOrchestratorClient } from '../../contracts/ContainerOrchestratorClient';
import { DockerComposeClientBase } from '../DockerComposeClientBase/DockerComposeClientBase';

export class FinchComposeClient extends DockerComposeClientBase implements IContainerOrchestratorClient {
    /**
     * The ID of the Finch Compose client
     */
    public static ClientId = 'com.microsoft.visualstudio.orchestrators.finchcompose';

    /**
     * Constructs a new {@link FinchComposeClient}
     * @param commandName (Optional, default `finch`) The command that will be run
     * as the base command. If quoting is necessary, it is the responsibility of the
     * caller to add.
     * @param displayName (Optional, default 'Finch Compose') The human-friendly display
     * name of the client
     * @param description (Optional, with default) The human-friendly description of
     * the client
     * @param composeV2 (Optional, default `true`) If true, `compose` will be added as the
     * first argument to all commands. The base command should be `finch`.
     */
    public constructor(
        commandName: string = 'finch',
        displayName: string = 'Finch Compose',
        description: string = 'Runs orchestrator commands using the Finch Compose CLI',
        composeV2: boolean = true
    ) {
        super(
            FinchComposeClient.ClientId,
            commandName,
            displayName,
            description
        );

        // Finch always uses the V2 compose syntax (finch compose <command>)
        this.composeV2 = composeV2;
    }
}
