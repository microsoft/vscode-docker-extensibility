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
    parse: (output: string, strict: boolean) => Promise<T>;
};

export type GeneratorCommandResponse<T> = CommandResponseBase & {
    parseStream: (output: NodeJS.ReadableStream, strict: boolean, cancellationToken?: CancellationTokenLike) => AsyncGenerator<T>;
};

export type VoidCommandResponse = CommandResponseBase;

/**
 * A CommandResponse record provides instructions on how to invoke a command
 * and a parse callback that can be used to parse and normalize the standard
 * output from invoking the command. This is the standard type returned by all
 * commands defined by the IContainersClient interface.
 */
export type CommandResponse<T> = PromiseCommandResponse<T> | GeneratorCommandResponse<T> | VoidCommandResponse;

function isCommandResponseBase(maybeCommandResponse: unknown): maybeCommandResponse is CommandResponseBase {
    const asCommandResponse = maybeCommandResponse as CommandResponseBase;

    if (!asCommandResponse || typeof asCommandResponse !== 'object') {
        return false;
    }

    if (typeof asCommandResponse.command !== 'string') {
        return false;
    }

    if (!Array.isArray(asCommandResponse.args)) {
        return false;
    }

    return true;
}

export function isPromiseCommandResponse<T>(maybePromiseCommandResponse: unknown): maybePromiseCommandResponse is PromiseCommandResponse<T> {
    return isCommandResponseBase(maybePromiseCommandResponse) &&
        typeof (maybePromiseCommandResponse as PromiseCommandResponse<T>).parse === 'function';
}

export function isGeneratorCommandResponse<T>(maybeGeneratorCommandResponse: unknown): maybeGeneratorCommandResponse is GeneratorCommandResponse<T> {
    return isCommandResponseBase(maybeGeneratorCommandResponse) &&
        typeof (maybeGeneratorCommandResponse as GeneratorCommandResponse<T>).parseStream === 'function';
}

export function isVoidCommandResponse(maybeVoidCommandResponse: unknown): maybeVoidCommandResponse is VoidCommandResponse {
    return isCommandResponseBase(maybeVoidCommandResponse) &&
        !isPromiseCommandResponse(maybeVoidCommandResponse) &&
        !isGeneratorCommandResponse(maybeVoidCommandResponse);
}

type ThingLike<T> = T | Promise<T> | (() => T | Promise<T>);

export type CommandResponseLike<T> = ThingLike<CommandResponse<T>>;
export type GeneratorCommandResponseLike<T> = ThingLike<GeneratorCommandResponse<T>>;

//export type CommandResponseLike<T> = CommandResponse<T> | Promise<CommandResponse<T>> | (() => CommandResponse<T> | Promise<CommandResponse<T>>);

/**
 * A {@link CommandRunner} provides instructions on how to invoke a command
 */
export type CommandRunner =
    ((commandResponse: ThingLike<VoidCommandResponse>) => Promise<void>) |
    (<T>(commandResponse: ThingLike<PromiseCommandResponse<T>>) => Promise<T>) |
    (<T>(commandResponse: ThingLike<GeneratorCommandResponse<T>>) => AsyncGenerator<T, void, unknown>);

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
