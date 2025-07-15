/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AccumulatorStream } from '../utils/AccumulatorStream';
import { NoShell } from '../utils/Shell';
import { spawnStreamAsync } from '../utils/spawnStreamAsync';

describe('(integration) spawnStreamAsync', () => {
    it('Should work on Windows please', async () => {
        const command = "docker";
        const args = ['container', 'ls', '--all'];

        const errAccumulator = new AccumulatorStream();
        const outAccumulator = new AccumulatorStream();

        try {
            await spawnStreamAsync(command, args, {
                stdOutPipe: outAccumulator,
                stdErrPipe: errAccumulator,
                //shellProvider: Shell.getShellOrDefault(),
                shellProvider: new NoShell(),
            });
        } catch (error) {
            console.error('Error executing command:', error);
        }

        console.log('stdout:', await outAccumulator.getString());
        console.log('stderr:', await errAccumulator.getString());
    });
});
