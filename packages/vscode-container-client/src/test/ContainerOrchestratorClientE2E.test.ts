/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import * as path from 'path';
import { DockerComposeClient } from '../clients/DockerComposeClient/DockerComposeClient';
import { ShellStreamCommandRunnerFactory, ShellStreamCommandRunnerOptions } from '../commandRunners/shellStream';
import { WslShellCommandRunnerFactory, WslShellCommandRunnerOptions } from '../commandRunners/wslStream';
import { IContainerOrchestratorClient } from '../contracts/ContainerOrchestratorClient';
import { CommandResponseBase, ICommandRunnerFactory } from '../contracts/CommandRunner';
import { wslifyPath } from '../utils/wslifyPath';
import { Bash } from '../utils/spawnStreamAsync';
import { DockerClient } from '../clients/DockerClient/DockerClient';
import { validateContainerExists } from './ContainersClientE2E.test';

/**
 * WARNING: This test suite will create and remove containers and networks related to the test docker-compose.yml file.
 */

// Modify the below options to configure the tests
const runInWsl: boolean = false; // Set to true if running in WSL

// No need to modify below this
describe('(integration) ContainerOrchestratorClientE2E', function () {

    // #region Test Setup

    let client: IContainerOrchestratorClient;
    let containerClient: DockerClient;
    let defaultRunner: ICommandRunnerFactory;
    let defaultRunnerFactory: (options: ShellStreamCommandRunnerOptions) => ICommandRunnerFactory;
    let composeFilePath: string;
    let composeDir: string;

    this.timeout(30000); // Set a longer timeout for integration tests

    before(function () {
        client = new DockerComposeClient();
        containerClient = new DockerClient(); // Used for validating that the containers are created and removed correctly

        if (!runInWsl) {
            defaultRunnerFactory = (options: ShellStreamCommandRunnerOptions) => new ShellStreamCommandRunnerFactory(options);
        } else {
            defaultRunnerFactory = (options: WslShellCommandRunnerOptions) => new WslShellCommandRunnerFactory(options);
        }

        defaultRunner = defaultRunnerFactory({ strict: true, });

        // Set up paths for test docker-compose file
        composeDir = path.resolve(__dirname, 'buildContext');
        composeFilePath = path.resolve(composeDir, 'docker-compose.yml');

        if (runInWsl) {
            composeDir = wslifyPath(composeDir);
            composeFilePath = wslifyPath(composeFilePath);
        }
    });

    after(async function () {
        // Ensure all services are down after tests complete
        try {
            await defaultRunner.getCommandRunner()(
                client.down({
                    files: [composeFilePath],
                    removeVolumes: true
                })
            );
        } catch (error) {
            // Ignore errors during cleanup
        }
    });

    // #endregion

    // #region Client Identity

    describe('Client Identity', function () {
        it('ClientIdentity', function () {
            expect(client.id).to.be.a('string');
            expect(client.displayName).to.be.a('string');
            expect(client.description).to.be.a('string');
            expect(client.commandName).to.be.a('string');
        });
    });

    // #endregion

    // #region Up Command

    describe('Up', function () {
        it('UpCommand', async function () {
            // Bring up the services
            await defaultRunner.getCommandRunner()(
                client.up({
                    files: [composeFilePath],
                    detached: true,
                })
            );

            // Verify the containers are running
            await validateContainerExists(containerClient, defaultRunner, { containerName: 'frontend' });
            await validateContainerExists(containerClient, defaultRunner, { containerName: 'backend' });
        });
    });

    // #endregion

    // #region Down Command

    describe('Down', function () {
        before('Down', async function () {
            // Ensure services are up before down test
            await defaultRunner.getCommandRunner()(
                client.up({
                    files: [composeFilePath],
                    detached: true,
                })
            );
        });

        it('DownCommand', async function () {
            // Bring down the services
            await defaultRunner.getCommandRunner()(
                client.down({
                    files: [composeFilePath],
                    removeVolumes: true,
                })
            );

            // Test specific options
            const command = await client.down({
                files: [composeFilePath],
                removeVolumes: true,
                removeImages: 'local',
                timeoutSeconds: 30,
                services: ['frontend'],
                customOptions: '--remove-orphans',
                projectName: 'test-project'
            });

            expect(getBashCommandLine(command)).to.include('--volumes');
            expect(getBashCommandLine(command)).to.include('--rmi local');
            expect(getBashCommandLine(command)).to.include('-t 30');
            expect(getBashCommandLine(command)).to.include('--remove-orphans');
            expect(getBashCommandLine(command)).to.include('-p test-project');
            expect(getBashCommandLine(command)).to.include('frontend');
        });
    });

    // #endregion

    // #region Start Command

    describe('Start', function () {
        before('Start', async function () {
            // Create services but make sure they're stopped
            await defaultRunner.getCommandRunner()(
                client.up({
                    files: [composeFilePath],
                    detached: true,
                })
            );

            await defaultRunner.getCommandRunner()(
                client.stop({
                    files: [composeFilePath],
                })
            );
        });

        it('StartCommand', async function () {
            // Start the services
            await defaultRunner.getCommandRunner()(
                client.start({
                    files: [composeFilePath],
                })
            );

            // Test specific options
            const command = await client.start({
                files: [composeFilePath],
                services: ['frontend', 'backend'],
                projectName: 'test-project',
                environmentFile: '.env'
            });

            expect(getBashCommandLine(command)).to.include('frontend backend');
            expect(getBashCommandLine(command)).to.include('-p test-project');
            expect(getBashCommandLine(command)).to.include('--env-file .env');
        });
    });

    // #endregion

    // #region Stop Command

    describe('Stop', function () {
        before('Stop', async function () {
            // Ensure services are up before stop test
            await defaultRunner.getCommandRunner()(
                client.up({
                    files: [composeFilePath],
                    detached: true,
                })
            );
        });

        it('StopCommand', async function () {
            // Stop the services
            await defaultRunner.getCommandRunner()(
                client.stop({
                    files: [composeFilePath],
                })
            );

            // Test specific options
            const command = await client.stop({
                files: [composeFilePath],
                timeoutSeconds: 30,
                services: ['backend'],
                projectName: 'test-project'
            });

            expect(getBashCommandLine(command)).to.include('-t 30');
            expect(getBashCommandLine(command)).to.include('backend');
            expect(getBashCommandLine(command)).to.include('-p test-project');
        });
    });

    // #endregion

    // #region Restart Command

    describe('Restart', function () {
        before('Restart', async function () {
            // Ensure services are up before restart test
            await defaultRunner.getCommandRunner()(
                client.up({
                    files: [composeFilePath],
                    detached: true,
                })
            );
        });

        it('RestartCommand', async function () {
            // Restart the services
            await defaultRunner.getCommandRunner()(
                client.restart({
                    files: [composeFilePath],
                })
            );

            // Test specific options
            const command = await client.restart({
                files: [composeFilePath],
                timeoutSeconds: 15,
                services: ['frontend'],
                projectName: 'test-project'
            });

            expect(getBashCommandLine(command)).to.include('-t 15');
            expect(getBashCommandLine(command)).to.include('frontend');
            expect(getBashCommandLine(command)).to.include('-p test-project');
        });
    });

    // #endregion

    // #region Logs Command

    describe('Logs', function () {
        before('Logs', async function () {
            // Ensure services are up before logs test
            await defaultRunner.getCommandRunner()(
                client.up({
                    files: [composeFilePath],
                    detached: true,
                })
            );
        });

        it('LogsCommand', async function () {
            // Get logs without following
            const logsStream = defaultRunner.getStreamingCommandRunner()(
                client.logs({
                    files: [composeFilePath],
                    follow: false,
                    tail: 10,
                })
            );

            // Read some of the logs (don't need to read all)
            let logsFound = false;
            for await (const chunk of logsStream) {
                expect(chunk).to.be.a('string');
                logsFound = true;
                break; // Just need to verify we can get some logs
            }

            expect(logsFound).to.be.true;

            // Test specific options
            const command = await client.logs({
                files: [composeFilePath],
                follow: true,
                tail: 50,
                services: ['frontend'],
                projectName: 'test-project'
            });

            expect(getBashCommandLine(command)).to.include('--follow');
            expect(getBashCommandLine(command)).to.include('--tail=50');
            expect(getBashCommandLine(command)).to.include('frontend');
            expect(getBashCommandLine(command)).to.include('-p test-project');
        });
    });

    // #endregion

    // #region Config Command

    describe('Config', function () {
        it('ConfigServices', async function () {
            const services = await defaultRunner.getCommandRunner()(
                client.config({
                    files: [composeFilePath],
                    configType: 'services',
                })
            );

            expect(services).to.be.an('array');
            expect(services).to.include('frontend');
            expect(services).to.include('backend');
        });

        it('ConfigImages', async function () {
            const images = await defaultRunner.getCommandRunner()(
                client.config({
                    files: [composeFilePath],
                    configType: 'images',
                })
            );

            expect(images).to.be.an('array');
            expect(images.length).to.be.greaterThan(0);
            // The docker-compose.yml uses alpine:latest for both services
            expect(images.some(i => i.includes('alpine:latest'))).to.be.true;
        });

        it('ConfigProfiles', async function () {
            // The test docker-compose.yml doesn't define profiles, but the command should still work
            const profiles = await defaultRunner.getCommandRunner()(
                client.config({
                    files: [composeFilePath],
                    configType: 'profiles',
                })
            );

            expect(profiles).to.be.an('array');
        });

        it('ConfigVolumes', async function () {
            // The test docker-compose.yml doesn't define volumes, but the command should still work
            const volumes = await defaultRunner.getCommandRunner()(
                client.config({
                    files: [composeFilePath],
                    configType: 'volumes',
                })
            );

            expect(volumes).to.be.an('array');
        });
    });

    // #endregion
});

// #region Helper Methods

function getBashCommandLine(command: CommandResponseBase): string {
    const bash = new Bash();
    return `${command.command} ${bash.quote(command.args).join(' ')}`;
}

// #endregion
