/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationTokenLike } from '../typings/CancellationTokenLike';
import { CommandLineArgs } from '../utils/commandLineBuilder';

type CommandResponseBase = {
    command: string;
    args: CommandLineArgs;
};

export type PromiseCommandResponse<T> = CommandResponseBase & {
    parse?: (output: string, strict: boolean) => Promise<T>;
};

export type GeneratorCommandResponse<T> = CommandResponseBase & {
    parseStream?: (output: NodeJS.ReadableStream, strict: boolean, cancellationToken?: CancellationTokenLike) => AsyncGenerator<T>;
};

/**
 * A CommandResponse record provides instructions on how to invoke a command
 * and a parse callback that can be used to parse and normalize the standard
 * output from invoking the command. This is the standard type returned by all
 * commands defined by the IContainersClient interface.
 */
export type CommandResponse<T> = PromiseCommandResponse<T> | GeneratorCommandResponse<T>;

export type CommandResponseLike<T> = CommandResponse<T> | Promise<CommandResponse<T>> | (() => CommandResponse<T> | Promise<CommandResponse<T>>);

/**
 * A {@link CommandRunner} provides instructions on how to invoke a command
 */
export type CommandRunner = <T>(commandResponse: CommandResponseLike<T>) => Promise<T>;

/**
 * A {@link ICommandRunnerFactory} is used to build a CommandRunner instance
 * based for a specific configuration
 */
export interface ICommandRunnerFactory {
    getCommandRunner(): CommandRunner;
}

export function normalizeCommandResponseLike<T>(commandResponseLike: CommandResponseLike<T>): Promise<CommandResponse<T>> {
    if (typeof commandResponseLike === 'function') {
        return Promise.resolve(commandResponseLike());
    } else {
        return Promise.resolve(commandResponseLike);
    }
}
