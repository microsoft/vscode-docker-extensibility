/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommandLineArgs } from '../utils/commandLineBuilder';

/**
 * A CommandResponse record provides instructions on how to invoke a command
 * and a parse callback that can be used to parse and normalize the standard
 * output from invoking the command. This is the standard type returned by all
 * commands defined by the IContainersClient interface.
 */
export type CommandResponse<T> = {
    command: string;
    args: CommandLineArgs;
    parse: (output: string, strict: boolean) => Promise<T>;
};

/**
 * A {@link CommandRunner} provides instructions on how to invoke a command
 */
export type CommandRunner = <T>(commandResponse: CommandResponse<T>, options: never) => Promise<T>;
