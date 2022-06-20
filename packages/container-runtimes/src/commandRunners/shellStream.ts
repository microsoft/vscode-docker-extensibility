/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as stream from 'stream';
import {
    CommandResponse,
    CommandResponseLike,
    CommandRunner,
    ICommandRunnerFactory,
    normalizeCommandResponseLike,
} from '../contracts/CommandRunner';
import { powershellQuote, spawnStreamAsync, StreamSpawnOptions } from '../utils/spawnAsync';

export type ShellStreamCommandRunnerOptions = StreamSpawnOptions & {
    strict?: boolean;
    stdOutPipe?: NodeJS.ReadWriteStream; // Overridden to be a duplex stream, so `parse` can read back from it
    stdErrPipe?: NodeJS.ReadWriteStream; // Overridden to be a duplex stream, so `parse` can read back from it
};

export class ShellStreamCommandRunnerFactory<TOptions extends ShellStreamCommandRunnerOptions> implements ICommandRunnerFactory {
    public constructor(protected readonly options: TOptions) {
    }

    public getCommandRunner(): CommandRunner {
        this.options.stdOutPipe ||= new stream.PassThrough();
        this.options.stdErrPipe ||= new stream.PassThrough();

        return async <T>(commandResponseLike: CommandResponseLike<T>) => {
            const commandResponse = await normalizeCommandResponseLike(commandResponseLike);
            const { command, args } = this.getCommandAndArgs(commandResponse);

            await spawnStreamAsync(command, args, { ...this.options, shell: true });
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return await commandResponse.parse(this.options.stdOutPipe!, this.options.stdErrPipe!, !!this.options.strict);
        };
    }

    protected getCommandAndArgs(commandResponse: CommandResponse<unknown>): { command: string, args: string[] } {
        return {
            command: commandResponse.command,
            args: powershellQuote(commandResponse.args)
        };
    }
}
