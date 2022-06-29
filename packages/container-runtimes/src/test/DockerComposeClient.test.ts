/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { describe, it } from 'mocha';

import {
    DockerComposeClient,
} from '../clients/DockerComposeClient/DockerComposeClient';
import { ShellStreamCommandRunnerFactory } from '../commandRunners/shellStream';
import {
    ConfigCommandOptions,
    DownCommandOptions,
    LogsCommandOptions,
    RestartCommandOptions,
    StartCommandOptions,
    StopCommandOptions,
    UpCommandOptions
} from '../contracts/ContainerOrchestratorClient';
import { AccumulatorStream } from '../utils/AccumulatorStream';

xdescribe('DockerComposeClient', () => {
    const client = new DockerComposeClient();
    const cwd = 'TODO';
    const runnerFactory = new ShellStreamCommandRunnerFactory({
        cwd: cwd,
    });
    const runner = runnerFactory.getCommandRunner();

    it('Should support up command', async () => {
        const options: UpCommandOptions = {
            files: ['docker-compose.yml'],
            detached: true,
            build: true,
        };

        await runner(client.up(options));
    });

    it('Should support down command', async () => {
        const options: DownCommandOptions = {
            files: ['docker-compose.yml'],
        };

        await runner(client.down(options));
    });

    it('Should support start command', async () => {
        const options: StartCommandOptions = {
            files: ['docker-compose.yml'],
        };

        await runner(client.start(options));
    });

    it('Should support stop command', async () => {
        const options: StopCommandOptions = {
            files: ['docker-compose.yml'],
        };

        await runner(client.stop(options));
    });

    it('Should support restart command', async () => {
        const options: RestartCommandOptions = {
            files: ['docker-compose.yml'],
        };

        await runner(client.restart(options));
    });

    it('Should support logs command', async () => {
        const options: LogsCommandOptions = {
            files: ['docker-compose.yml'],
        };

        const accumulator = new AccumulatorStream();
        const logsCRF = new ShellStreamCommandRunnerFactory({
            cwd: cwd,
            stdOutPipe: accumulator,
        });

        await logsCRF.getCommandRunner()(client.logs(options));
        expect(await accumulator.getString()).to.be.ok;
    });

    it('Should support config command', async () => {
        const options: ConfigCommandOptions = {
            configType: 'services',
        };

        const result = await runner(client.config(options));
        expect(result).to.be.ok;
        expect(result).to.contain('registry');
    });
});
