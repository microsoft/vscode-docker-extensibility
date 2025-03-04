/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import * as stream from 'stream';
import { IContainersClient } from '../contracts/ContainerClient';
import { DockerClient } from '../clients/DockerClient/DockerClient';
import { PodmanClient } from '../clients/PodmanClient/PodmanClient';
import { ShellStreamCommandRunnerFactory, ShellStreamCommandRunnerOptions } from '../commandRunners/shellStream';
import { ICommandRunnerFactory } from '../contracts/CommandRunner';
import { WslShellCommandRunnerFactory, WslShellCommandRunnerOptions } from '../commandRunners/wslStream';
import { FileType } from 'vscode';

// Modify the below options to configure the tests
const clientTypeToTest: 'docker' | 'podman' = 'docker';
const runnerTypeToTest: 'shell' | 'wsl' = 'shell';

// Supply to run the login/logout tests
const dockerHubUsername = '';
const dockerHubPAT = ''; // Never commit this value!!

// No need to modify below this

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe('(integration) ContainersClientE2E', function () {
    let client: IContainersClient;
    let defaultRunnerFactory: ICommandRunnerFactory;
    let defaultRunnerFactoryFactory: (options: ShellStreamCommandRunnerOptions) => ICommandRunnerFactory;

    this.timeout(10000); // Set a longer timeout for integration tests

    before(function () {
        if (clientTypeToTest === 'docker') {
            client = new DockerClient();
        } else if (clientTypeToTest === 'podman') {
            client = new PodmanClient();
        } else {
            throw new Error('Invalid clientTypeToTest');
        }

        if (runnerTypeToTest === 'shell') {
            defaultRunnerFactoryFactory = (options: ShellStreamCommandRunnerOptions) => new ShellStreamCommandRunnerFactory(options);
        } else if (runnerTypeToTest === 'wsl') {
            defaultRunnerFactoryFactory = (options: WslShellCommandRunnerOptions) => new WslShellCommandRunnerFactory(options);
        } else {
            throw new Error('Invalid runnerTypeToTest');
        }

        defaultRunnerFactory = defaultRunnerFactoryFactory({});
    });

    // Test client identity
    describe('Client Identity', function () {
        it('ClientIdentity', function () {
            expect(client.id).to.be.a('string');
            expect(client.displayName).to.be.a('string');
            expect(client.description).to.be.a('string');
            expect(client.commandName).to.be.a('string');
        });

        it('ImageNameDefaults', function () {
            expect(client.defaultRegistry).to.be.a('string');
            expect(client.defaultTag).to.be.a('string');
        });
    });

    // Test system info
    describe('System Info', function () {
        it('VersionCommand', async function () {
            const version = await defaultRunnerFactory.getCommandRunner()(
                client.version({})
            );

            expect(version).to.be.ok;
            expect(version.client).to.be.a('string');

            if (clientTypeToTest === 'docker') {
                expect(version.server).to.be.a('string');
            }
            // Server version is optional for podman so we won't check it
        });

        it('CheckInstallCommand', async function () {
            const checkInstall = await defaultRunnerFactory.getCommandRunner()(
                client.checkInstall({})
            );

            expect(checkInstall).to.be.ok;
            expect(checkInstall).to.be.a('string');
        });

        it('InfoCommand', async function () {
            const info = await defaultRunnerFactory.getCommandRunner()(
                client.info({})
            );

            expect(info).to.be.ok;
            expect(info.operatingSystem).to.be.a('string');
            expect(info.osType).to.be.a('string');
            expect(info.raw).to.be.a('string');
        });
    });

    // Test images
    describe('Images', function () {
        it('Should do', function () {
            expect.fail('TODO');
        });
    });

    // Test containers
    describe('Containers', function () {
        it('Should do', function () {
            expect.fail('TODO');
        });
    });

    // Test networks
    describe('Networks', function () {
        it('Should do', function () {
            expect.fail('TODO');
        });
    });

    // Test volumes
    describe('Volumes', function () {
        it('Should do', function () {
            expect.fail('TODO');
        });
    });

    // Test login/logout
    describe('Login/Logout', function () {
        it('LoginCommand', async function () {
            if (!dockerHubUsername || !dockerHubPAT) {
                this.skip();
            }

            const secretStream = stream.Readable.from(dockerHubPAT);
            const runnerFactory = defaultRunnerFactoryFactory({ stdInPipe: secretStream });
            await runnerFactory.getCommandRunner()(
                client.login({ username: dockerHubUsername, passwordStdIn: true })
            );
        });

        it('LogoutCommand', async function () {
            if (!dockerHubUsername || !dockerHubPAT) {
                this.skip();
            }

            await defaultRunnerFactory.getCommandRunner()(
                client.logout({})
            );
        });
    });

    // Test events
    describe('Events', function () {
        let container: string | undefined;

        before('Events', async function () {
            // Create a container so that the event stream has something to report
            container = await defaultRunnerFactory.getCommandRunner()(
                client.runContainer({
                    imageRef: 'hello-world:latest',
                    detached: true,
                })
            );
        });

        it('GetEventStreamCommand', async function () {
            const eventStream = defaultRunnerFactory.getStreamingCommandRunner()(
                client.getEventStream({ since: '1m', until: '-1s' }) // From 1m ago to 1s in the future
            );

            for await (const event of eventStream) {
                expect(event).to.be.ok;
                expect(event.action).to.be.a('string');
                expect(event.actor).to.be.ok;
                expect(event.actor.id).to.be.a('string');
                expect(event.actor.attributes).to.be.ok;
                expect(event.timestamp).to.be.an.instanceOf(Date);
                expect(event.type).to.be.a('string');
                expect(event.raw).to.be.a('string');

                break; // Break after the first event
            }
        });

        after('Events', async function () {
            // Cleanup the container created for the event stream
            if (container) {
                await defaultRunnerFactory.getCommandRunner()(
                    client.removeContainers({ containers: [container], force: true })
                );
            }
        });
    });

    // Test contexts
    describe('Contexts', function () {
        it('ListContextsCommand', async function () {
            if (clientTypeToTest !== 'docker') {
                this.skip();
            }

            const contexts = await defaultRunnerFactory.getCommandRunner()(
                client.listContexts({})
            );

            expect(contexts).to.be.ok;
            expect(contexts).to.be.an('array');
            contexts.forEach((context) => {
                expect(context.name).to.be.a('string');
                expect(context.current).to.be.a('boolean');
            });
        });

        it('RemoveContextsCommand', async function () {
            if (clientTypeToTest !== 'docker') {
                this.skip();
            }
        });

        it('UseContextCommand', async function () {
            if (clientTypeToTest !== 'docker') {
                this.skip();
            }
        });

        it('InspectContextsCommand', async function () {
            if (clientTypeToTest !== 'docker') {
                this.skip();
            }
        });
    });

    // Test filesystem
    describe('Filesystem', function () {
        let containerId: string | undefined;

        before('Filesystem', async function () {
            containerId = await defaultRunnerFactory.getCommandRunner()(
                client.runContainer({
                    imageRef: 'alpine:latest',
                    detached: true,
                })
            );

            if (!containerId) {
                expect.fail('Failed to create container for filesystem tests');
            }
        });


        it('ListFilesCommand', async function () {
            const files = await defaultRunnerFactory.getCommandRunner()(
                client.listFiles({ container: containerId!, path: '/etc' })
            );

            expect(files).to.be.ok;
            expect(files).to.be.an('array');
            files.forEach((file) => {
                expect(file.name).to.be.a('string');
                expect(file.path).to.be.a('string');
                expect(file.size).to.be.a('number');
                expect(file.type).to.be.a('number');
            });
        });

        it('StatPathCommand', async function () {
            const stats = await defaultRunnerFactory.getCommandRunner()(
                client.statPath({ container: containerId!, path: '/etc/hosts' })
            );

            expect(stats).to.be.ok;
            expect(stats!.name).to.be.a('string');
            expect(stats!.path).to.be.a('string');
            expect(stats!.size).to.be.a('number');
            expect(stats!.type).to.equal(FileType.File);
        });

        it('ReadFileCommand', async function () {
            const contentStream = defaultRunnerFactory.getStreamingCommandRunner()(
                client.readFile({ container: containerId!, path: '/etc/hosts' })
            );

            let fileContent: string = "";

            for await (const chunk of contentStream) {
                expect(chunk).to.be.ok;
                expect(chunk).to.be.an.instanceOf(Buffer);
                fileContent += chunk.toString();
            }

            expect(fileContent).to.be.ok;
            expect(fileContent).to.include('localhost'); // "localhost" seems to always appear in /etc/hosts
        });

        it('WriteFileCommand', async function () {
            return;
        });

        after('Filesystem', async function () {
            if (containerId) {
                await defaultRunnerFactory.getCommandRunner()(
                    client.removeContainers({ containers: [containerId], force: true })
                );
            }
        });
    });
});

/* eslint-enable @typescript-eslint/no-non-null-assertion */
