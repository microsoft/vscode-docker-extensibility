/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { Cmd, Powershell, Shell, spawnStreamAsync, StreamSpawnOptions } from '../utils/spawnStreamAsync';
import { AccumulatorStream } from '../utils/AccumulatorStream';

const badCwd = 'D:\\PermaSandbox\\FakeDocker';

const accumulator = new AccumulatorStream();

const options: StreamSpawnOptions = {
    cwd: badCwd,
    //shell: true,
    //shellProvider: new Cmd(),
    stdOutPipe: accumulator,
};

describe('(unit) spawnStreamAsync', () => {
    it('should spawn a process and stream its output', async () => {
        let output: string;

        try {
            await spawnStreamAsync('docker', ['-v'], options);
        } catch (error) {
            console.log(JSON.stringify(error));
        } finally {
            output = await accumulator.getString();
        }

        expect(output).to.include('Docker version');
    });
});
