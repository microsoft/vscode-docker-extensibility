/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommandLineArgs, CommandLineCurryFn, withArg } from '@microsoft/vscode-processutils';

/**
 * Converts exposed ports to Finch-compatible -p arguments when publishAllPorts is true.
 *
 * In Docker, the combination of `--expose <port>` + `--publish-all` binds exposed ports
 * to random host ports. Finch/nerdctl doesn't support these flags, but supports the
 * equivalent syntax `-p <containerPort>` which binds to a random host port.
 *
 * @param exposePorts Array of ports to expose
 * @param publishAllPorts Whether to publish all ports (converts exposePorts to -p args)
 * @returns A CommandLineCurryFn that appends Finch-style port arguments
 */
export function withFinchExposedPortsArg(
    exposePorts: Array<number> | undefined,
    publishAllPorts: boolean | undefined
): CommandLineCurryFn {
    return (cmdLineArgs: CommandLineArgs = []) => {
        if (publishAllPorts && exposePorts && exposePorts.length > 0) {
            // Convert exposed ports to -p <containerPort> format
            // This is the Finch-equivalent of --expose + --publish-all
            return exposePorts.reduce(
                (args, port) => withArg('-p', port.toString())(args),
                cmdLineArgs
            );
        }
        // Note: If only exposePorts is set without publishAllPorts, we ignore it
        // because Finch has no equivalent to Docker's --expose flag (which marks
        // ports as exposed for container networking without binding to host).
        // In Finch, ports are already accessible within container networks.

        // Note: If only publishAllPorts is set without exposePorts, we ignore it
        // because there's no way in Finch to discover and publish all EXPOSE ports
        // from the Dockerfile. Users need to specify ports explicitly.

        return cmdLineArgs;
    };
}
