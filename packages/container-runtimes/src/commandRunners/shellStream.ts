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
};

export class ShellStreamCommandRunnerFactory<TOptions extends ShellStreamCommandRunnerOptions> implements ICommandRunnerFactory {
    public constructor(protected readonly options: TOptions) {
    }

    public getCommandRunner(): CommandRunner {
        const mainOutputStream = new stream.PassThrough();
        let parseOutputStream = mainOutputStream;
        if (this.options.stdOutPipe) {
            // If the client also wants output, `mainOutputStream` will become a splitter that sends
            // one copy to the client's desired stream, and another to a stream for `parse` to consume
            mainOutputStream.pipe(this.options.stdOutPipe);
            mainOutputStream.pipe(parseOutputStream = new stream.PassThrough());
        }

        const mainErrorStream = new stream.PassThrough();
        let parseErrorStream = mainErrorStream;
        if (this.options.stdErrPipe) {
            // If the client also wants output, `mainErrorStream` will become a splitter that sends
            // one copy to the client's desired stream, and another to a stream for `parse` to consume
            mainErrorStream.pipe(this.options.stdErrPipe);
            mainErrorStream.pipe(parseErrorStream = new stream.PassThrough());
        }

        return async <T>(commandResponseLike: CommandResponseLike<T>) => {
            const commandResponse = await normalizeCommandResponseLike(commandResponseLike);
            const { command, args } = this.getCommandAndArgs(commandResponse);

            // Don't wait, `parse` will (usually) await the output stream later
            // Waiting would put backpressure on the output stream
            void spawnStreamAsync(command, args, { ...this.options, shell: true });

            const result = await commandResponse.parse(parseOutputStream, parseErrorStream, !!this.options.strict);

            parseOutputStream.destroy();
            parseErrorStream.destroy();

            return result;
        };
    }

    protected getCommandAndArgs(commandResponse: CommandResponse<unknown>): { command: string, args: string[] } {
        return {
            command: commandResponse.command,
            args: powershellQuote(commandResponse.args)
        };
    }
}
