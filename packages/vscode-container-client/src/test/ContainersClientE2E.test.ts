/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as stream from 'stream';
import { FileType } from 'vscode';
import { DockerClient } from '../clients/DockerClient/DockerClient';
import { PodmanClient } from '../clients/PodmanClient/PodmanClient';
import { ShellStreamCommandRunnerFactory, ShellStreamCommandRunnerOptions } from '../commandRunners/shellStream';
import { WslShellCommandRunnerFactory, WslShellCommandRunnerOptions } from '../commandRunners/wslStream';
import { IContainersClient } from '../contracts/ContainerClient';
import { CommandResponseBase, ICommandRunnerFactory } from '../contracts/CommandRunner';
import { Bash } from '../utils/spawnStreamAsync';
import { wslifyPath } from '../utils/wslifyPath';

/**
 * WARNING: This test suite will prune unused images, containers, networks, and volumes.
 */

// Modify the below options to configure the tests
const clientTypeToTest: 'docker' | 'podman' = 'docker';
const runInWsl: boolean = false; // Set to true if running in WSL

// Supply to run the login/logout tests
const dockerHubUsername = '';
const dockerHubPAT = ''; // Never commit this value!!

// No need to modify below this

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe('(integration) ContainersClientE2E', function () {

    // #region Test Setup
    let client: IContainersClient;
    let defaultRunner: ICommandRunnerFactory;
    let defaultRunnerFactory: (options: ShellStreamCommandRunnerOptions) => ICommandRunnerFactory;

    this.timeout(10000); // Set a longer timeout for integration tests

    before(function () {
        if (clientTypeToTest === 'docker') {
            client = new DockerClient();
        } else if (clientTypeToTest === 'podman') {
            client = new PodmanClient();
        } else {
            throw new Error('Invalid clientTypeToTest');
        }

        if (!runInWsl) {
            defaultRunnerFactory = (options: ShellStreamCommandRunnerOptions) => new ShellStreamCommandRunnerFactory(options);
        } else {
            defaultRunnerFactory = (options: WslShellCommandRunnerOptions) => new WslShellCommandRunnerFactory(options);
        }

        defaultRunner = defaultRunnerFactory({});
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

        it('ImageNameDefaults', function () {
            expect(client.defaultRegistry).to.be.a('string');
            expect(client.defaultTag).to.be.a('string');
        });
    });

    // #endregion

    // #region System Info

    describe('System Info', function () {
        it('VersionCommand', async function () {
            const version = await defaultRunner.getCommandRunner()(
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
            const checkInstall = await defaultRunner.getCommandRunner()(
                client.checkInstall({})
            );

            expect(checkInstall).to.be.ok;
            expect(checkInstall).to.be.a('string');
        });

        it('InfoCommand', async function () {
            const info = await defaultRunner.getCommandRunner()(
                client.info({})
            );

            expect(info).to.be.ok;
            expect(info.operatingSystem).to.be.a('string');
            expect(info.osType).to.be.a('string');
            expect(info.raw).to.be.a('string');
        });
    });

    // #endregion

    // #region Images

    describe('Images', function () {
        const imageToTest = 'alpine:latest';
        let testDockerfileContext: string;
        let testDockerfile: string;

        before('Images', async function () {
            // Prepare the test Dockerfile context
            testDockerfileContext = path.resolve(__dirname, 'buildContext');
            testDockerfile = path.resolve(testDockerfileContext, 'Dockerfile');

            if (runInWsl) {
                testDockerfileContext = wslifyPath(testDockerfileContext);
                testDockerfile = wslifyPath(testDockerfile);
            }

            // Pull a small image for testing
            // This also tests PullImageCommand
            await defaultRunner.getCommandRunner()(
                client.pullImage({ imageRef: imageToTest })
            );
        });

        it('ListImagesCommand', async function () {
            expect(await validateImageExists(client, defaultRunner, imageToTest)).to.be.true;
        });

        it('TagImageCommand', async function () {
            // This is already fully tested in the it('RemoveImagesCommand') test
        });

        it('InspectImagesCommand', async function () {
            // Inspect the image
            const images = await defaultRunner.getCommandRunner()(
                client.inspectImages({ imageRefs: ['alpine:latest'] })
            );

            expect(images).to.be.ok;
            expect(images).to.be.an('array');
            expect(images.length).to.equal(1);

            const image = images[0];
            expect(image.id).to.be.a('string');
            expect(image.image).to.be.an('object');
            expect(image.repoDigests).to.be.an('array');
            expect(image.entrypoint).to.be.an('array');
            expect(image.command).to.be.an('array');
            expect(image.labels).to.be.an('object');
            expect(image.createdAt).to.be.instanceOf(Date);
            expect(image.raw).to.be.a('string');
        });

        it('BuildImageCommand', async function () {
            const testTag = 'build-test-image:latest';

            await defaultRunner.getCommandRunner()(
                client.buildImage({
                    path: testDockerfileContext,
                    file: testDockerfile,
                    tags: [testTag],
                })
            );

            // Verify the image was built
            expect(await validateImageExists(client, defaultRunner, testTag)).to.be.true;
        });

        it('PullImageCommand', async function () {
            // This is already fully tested between the before('Images') hook and it('ListImagesCommand') test
        });

        it('PushImageCommand', async function () {
            const testTag = 'push-test-image:latest';

            // Since we can't actually push without credentials, we'll verify the command generation
            const command = await client.pushImage({ imageRef: testTag });
            expect(command).to.be.ok;
            expect(command.command).to.be.a('string');
            expect(command.args).to.be.an('array');

            // We expect push and the image reference
            expect(getBashCommandLine(command)).to.equal(`${client.commandName} image push ${testTag}`);
        });

        it('RemoveImagesCommand', async function () {
            const testTag = 'remove-test-image:latest';

            // Re-tag the base image to a new one so we have something to remove
            // This also tests TagImageCommand
            await defaultRunner.getCommandRunner()(
                client.tagImage({ fromImageRef: imageToTest, toImageRef: testTag })
            );

            // Remove the image using our tag
            const removedImages = await defaultRunner.getCommandRunner()(
                client.removeImages({ imageRefs: [testTag], force: true })
            );

            expect(removedImages).to.be.ok;
            expect(removedImages).to.be.an('array');

            // Verify it was removed
            expect(await validateImageExists(client, defaultRunner, testTag)).to.be.false;
        });

        it('PruneImagesCommand', async function () {
            // Build an image without a tag, which we can subsequently prune
            await defaultRunner.getCommandRunner()(
                client.buildImage({
                    path: testDockerfileContext,
                    file: testDockerfile,
                })
            );

            // Prune the image
            const pruneResult = await defaultRunner.getCommandRunner()(
                client.pruneImages({})
            );

            expect(pruneResult).to.be.ok;
            if (pruneResult.imageRefsDeleted) {
                expect(pruneResult.imageRefsDeleted).to.be.an('array');
            }
            if (pruneResult.spaceReclaimed !== undefined) {
                expect(pruneResult.spaceReclaimed).to.be.a('number');
            }
        });
    });

    // #endregion

    // #region Containers

    describe('Containers', function () {
        const imageToTest = 'alpine:latest';
        let testContainerId: string;

        before('Containers', async function () {
            // Pull a small image for testing
            await defaultRunner.getCommandRunner()(
                client.pullImage({ imageRef: imageToTest })
            );

            // Create a container that will stay running
            testContainerId = await defaultRunner.getCommandRunner()(
                client.runContainer({
                    imageRef: imageToTest,
                    detached: true,
                    name: 'test-container-e2e'
                })
            ) as string;

            expect(testContainerId).to.be.a('number');
        });

        after('Containers', async function () {
            // Clean up the test container if it exists
            if (testContainerId) {
                await defaultRunner.getCommandRunner()(
                    client.removeContainers({ containers: [testContainerId], force: true })
                );
            }
        });

        it('RunContainerCommand', async function () {
            // Create a container that will stay running
            testContainerId = await defaultRunner.getCommandRunner()(
                client.runContainer({
                    imageRef: 'alpine:latest',
                    detached: true,
                    name: 'test-container-e2e'
                })
            );

            expect(testContainerId).to.be.a('string');
            expect(testContainerId!.length).to.be.greaterThan(0);
        });

        it('ListContainersCommand', async function () {
            // This gets tested in the it('RunContainerCommand') test
        });

        it('InspectContainersCommand', async function () {
            // Ensure we have a container to inspect
            expect(testContainerId).to.be.a('string');

            const containers = await defaultRunner.getCommandRunner()(
                client.inspectContainers({ containers: [testContainerId!] })
            );

            expect(containers).to.be.ok;
            expect(containers).to.be.an('array');
            expect(containers.length).to.equal(1);

            const container = containers[0];
            expect(container.id).to.equal(testContainerId);
            expect(container.name).to.equal('test-container-e2e');
            expect(container.image).to.be.an('object');
            expect(container.environmentVariables).to.be.an('object');
            expect(container.ports).to.be.an('array');
            expect(container.labels).to.be.an('object');
            expect(container.entrypoint).to.be.an('array');
            expect(container.command).to.be.an('array');
            expect(container.createdAt).to.be.instanceOf(Date);
            expect(container.raw).to.be.a('string');
        });

        it('ExecContainerCommand', async function () {
            // Ensure we have a running container
            expect(testContainerId).to.be.a('string');

            // Execute a command
            const commandStream = defaultRunner.getStreamingCommandRunner()(
                client.execContainer({
                    container: testContainerId!,
                    command: ['echo', 'Hello from container!']
                })
            );

            let output = '';
            for await (const chunk of commandStream) {
                output += chunk;
            }

            expect(output.trim()).to.equal('Hello from container!');
        });

        it('LogsForContainerCommand', async function () {
            // Ensure we have a running container
            expect(testContainerId).to.be.a('string');

            // Generate some logs in the container
            await defaultRunner.getStreamingCommandRunner()(
                client.execContainer({
                    container: testContainerId!,
                    command: ['sh', '-c', 'echo "Log entry for testing" >&2']
                })
            );

            // Get logs
            const logsStream = defaultRunner.getStreamingCommandRunner()(
                client.logsForContainer({
                    container: testContainerId!,
                    tail: 10
                })
            );

            let logs = '';
            for await (const chunk of logsStream) {
                logs += chunk;
            }

            expect(logs).to.include('Log entry for testing');
        });

        it('StopContainersCommand', async function () {
            // Ensure we have a container to stop
            expect(testContainerId).to.be.a('string');

            // Stop the container
            const stoppedContainers = await defaultRunner.getCommandRunner()(
                client.stopContainers({ container: [testContainerId!] })
            );

            expect(stoppedContainers).to.be.ok;
            expect(stoppedContainers).to.be.an('array');
            expect(stoppedContainers).to.include(testContainerId);

            // Verify it's stopped
            const containers = await defaultRunner.getCommandRunner()(
                client.listContainers({ all: true })
            );
            const testContainer = containers.find(c => c.id === testContainerId);
            expect(testContainer!.state.toLowerCase()).to.not.equal('running');
        });

        it('StartContainersCommand', async function () {
            // Ensure we have a stopped container
            expect(testContainerId).to.be.a('string');

            // Start the container
            const startedContainers = await defaultRunner.getCommandRunner()(
                client.startContainers({ container: [testContainerId!] })
            );

            expect(startedContainers).to.be.ok;
            expect(startedContainers).to.be.an('array');
            expect(startedContainers).to.include(testContainerId);

            // Verify it's running
            const containers = await defaultRunner.getCommandRunner()(
                client.listContainers({ all: false })
            );
            const testContainer = containers.find(c => c.id === testContainerId);
            expect(testContainer).to.be.ok;
            expect(testContainer!.state.toLowerCase()).to.equal('running');
        });

        it('RestartContainersCommand', async function () {
            // Ensure we have a container to restart
            expect(testContainerId).to.be.a('string');

            // Restart the container
            const restartedContainers = await defaultRunner.getCommandRunner()(
                client.restartContainers({ container: [testContainerId!] })
            );

            expect(restartedContainers).to.be.ok;
            expect(restartedContainers).to.be.an('array');
            expect(restartedContainers).to.include(testContainerId);

            // Verify it's running
            const containers = await defaultRunner.getCommandRunner()(
                client.listContainers({ all: false })
            );
            const testContainer = containers.find(c => c.id === testContainerId);
            expect(testContainer).to.be.ok;
            expect(testContainer!.state.toLowerCase()).to.equal('running');
        });

        it('StatsContainersCommand', async function () {
            // Get container stats
            const stats = await defaultRunner.getCommandRunner()(
                client.statsContainers({ all: false })
            );

            expect(stats).to.be.ok;
            expect(stats).to.be.a('string');
            // Stats should contain some metrics and our container ID/name
            expect(stats).to.include('CPU');
            expect(stats).to.include('MEM');
        });

        it('RemoveContainersCommand', async function () {
            // Ensure we have a container to remove
            expect(testContainerId).to.be.a('string');

            // Create a second container to test multiple container removal
            testContainerId2 = await defaultRunner.getCommandRunner()(
                client.runContainer({
                    imageRef: 'alpine:latest',
                    detached: true,
                    command: ['sleep', '1'],
                    name: 'test-container-e2e-2'
                })
            );

            expect(testContainerId2).to.be.a('string');

            // Remove the containers
            const removedContainers = await defaultRunner.getCommandRunner()(
                client.removeContainers({
                    containers: [testContainerId!, testContainerId2!],
                    force: true
                })
            );

            expect(removedContainers).to.be.ok;
            expect(removedContainers).to.be.an('array');
            expect(removedContainers).to.include(testContainerId);
            expect(removedContainers).to.include(testContainerId2);

            // Clear IDs since we removed them
            testContainerId = undefined;
            testContainerId2 = undefined;
        });

        it('PruneContainersCommand', async function () {
            // Run container prune
            const pruneResult = await defaultRunner.getCommandRunner()(
                client.pruneContainers({})
            );

            expect(pruneResult).to.be.ok;
            if (pruneResult.containersDeleted) {
                expect(pruneResult.containersDeleted).to.be.an('array');
            }
            if (pruneResult.spaceReclaimed !== undefined) {
                expect(pruneResult.spaceReclaimed).to.be.a('number');
            }
        });
    });

    // #endregion

    // #region Networks

    xdescribe('Networks', function () {
        const testNetworkName = 'test-network-e2e';

        after('Networks', async function () {
            try {
                // Clean up test network if it exists
                const networks = await defaultRunner.getCommandRunner()(
                    client.listNetworks({})
                );

                if (networks.some(n => n.name === testNetworkName)) {
                    await defaultRunner.getCommandRunner()(
                        client.removeNetworks({ networks: [testNetworkName] })
                    );
                }
            } catch (error) {
                console.log('Error cleaning up test network:', error);
            }
        });

        it('CreateNetworkCommand', async function () {
            // Create a test network
            await defaultRunner.getCommandRunner()(
                client.createNetwork({ name: testNetworkName })
            );

            // Verify it was created
            const networks = await defaultRunner.getCommandRunner()(
                client.listNetworks({})
            );

            expect(networks.some(n => n.name === testNetworkName)).to.be.true;
        });

        it('ListNetworksCommand', async function () {
            const networks = await defaultRunner.getCommandRunner()(
                client.listNetworks({})
            );

            expect(networks).to.be.ok;
            expect(networks).to.be.an('array');
            expect(networks.length).to.be.greaterThan(0);

            networks.forEach((network) => {
                expect(network.name).to.be.a('string');
                expect(network.driver).to.be.a('string');
                expect(network.labels).to.be.an('object');
            });

            // Make sure our test network is present
            expect(networks.some(n => n.name === testNetworkName)).to.be.true;
        });

        it('InspectNetworksCommand', async function () {
            const networks = await defaultRunner.getCommandRunner()(
                client.inspectNetworks({ networks: [testNetworkName] })
            );

            expect(networks).to.be.ok;
            expect(networks).to.be.an('array');
            expect(networks.length).to.equal(1);

            const network = networks[0];
            expect(network.name).to.equal(testNetworkName);
            expect(network.driver).to.be.a('string');
            expect(network.labels).to.be.an('object');
            expect(network.scope).to.be.a('string');
            expect(network.raw).to.be.a('string');
        });

        it('RemoveNetworksCommand', async function () {
            // Remove the test network
            const removedNetworks = await defaultRunner.getCommandRunner()(
                client.removeNetworks({ networks: [testNetworkName] })
            );

            expect(removedNetworks).to.be.ok;
            expect(removedNetworks).to.be.an('array');
            expect(removedNetworks).to.include(testNetworkName);

            // Verify it was removed
            const networks = await defaultRunner.getCommandRunner()(
                client.listNetworks({})
            );
            expect(networks.some(n => n.name === testNetworkName)).to.be.false;
        });

        it('PruneNetworksCommand', async function () {
            const pruneResult = await defaultRunner.getCommandRunner()(
                client.pruneNetworks({})
            );

            expect(pruneResult).to.be.ok;
            if (pruneResult.networksDeleted) {
                expect(pruneResult.networksDeleted).to.be.an('array');
            }
        });
    });

    // #endregion

    // #region Volumes

    xdescribe('Volumes', function () {
        const testVolumeName = 'test-volume-e2e';

        after('Volumes', async function () {
            try {
                // Clean up test volume if it exists
                const volumes = await defaultRunner.getCommandRunner()(
                    client.listVolumes({})
                );

                if (volumes.some(v => v.name === testVolumeName)) {
                    await defaultRunner.getCommandRunner()(
                        client.removeVolumes({ volumes: [testVolumeName] })
                    );
                }
            } catch (error) {
                console.log('Error cleaning up test volume:', error);
            }
        });

        it('CreateVolumeCommand', async function () {
            // Create a test volume
            await defaultRunner.getCommandRunner()(
                client.createVolume({ name: testVolumeName })
            );

            // Verify it was created
            const volumes = await defaultRunner.getCommandRunner()(
                client.listVolumes({})
            );

            expect(volumes.some(v => v.name === testVolumeName)).to.be.true;
        });

        it('ListVolumesCommand', async function () {
            const volumes = await defaultRunner.getCommandRunner()(
                client.listVolumes({})
            );

            expect(volumes).to.be.ok;
            expect(volumes).to.be.an('array');
            expect(volumes.length).to.be.greaterThan(0);

            volumes.forEach((volume) => {
                expect(volume.name).to.be.a('string');
                expect(volume.driver).to.be.a('string');
                expect(volume.labels).to.be.an('object');
                expect(volume.mountpoint).to.be.a('string');
                expect(volume.scope).to.be.a('string');
            });

            // Make sure our test volume is present
            expect(volumes.some(v => v.name === testVolumeName)).to.be.true;
        });

        it('InspectVolumesCommand', async function () {
            const volumes = await defaultRunner.getCommandRunner()(
                client.inspectVolumes({ volumes: [testVolumeName] })
            );

            expect(volumes).to.be.ok;
            expect(volumes).to.be.an('array');
            expect(volumes.length).to.equal(1);

            const volume = volumes[0];
            expect(volume.name).to.equal(testVolumeName);
            expect(volume.driver).to.be.a('string');
            expect(volume.mountpoint).to.be.a('string');
            expect(volume.scope).to.be.a('string');
            expect(volume.labels).to.be.an('object');
            expect(volume.options).to.be.an('object');
            expect(volume.createdAt).to.be.instanceOf(Date);
            expect(volume.raw).to.be.a('string');
        });

        it('RemoveVolumesCommand', async function () {
            // Remove the test volume
            const removedVolumes = await defaultRunner.getCommandRunner()(
                client.removeVolumes({ volumes: [testVolumeName] })
            );

            expect(removedVolumes).to.be.ok;
            expect(removedVolumes).to.be.an('array');
            expect(removedVolumes).to.include(testVolumeName);

            // Verify it was removed
            const volumes = await defaultRunner.getCommandRunner()(
                client.listVolumes({})
            );
            expect(volumes.some(v => v.name === testVolumeName)).to.be.false;
        });

        it('PruneVolumesCommand', async function () {
            const pruneResult = await defaultRunner.getCommandRunner()(
                client.pruneVolumes({})
            );

            expect(pruneResult).to.be.ok;
            if (pruneResult.volumesDeleted) {
                expect(pruneResult.volumesDeleted).to.be.an('array');
            }
            if (pruneResult.spaceReclaimed !== undefined) {
                expect(pruneResult.spaceReclaimed).to.be.a('number');
            }
        });
    });

    // #endregion

    // #region Login/Logout

    describe('Login/Logout', function () {
        it('LoginCommand', async function () {
            if (!dockerHubUsername || !dockerHubPAT) {
                this.skip();
            }

            const secretStream = stream.Readable.from(dockerHubPAT);
            const runnerFactory = defaultRunnerFactory({ stdInPipe: secretStream });
            await runnerFactory.getCommandRunner()(
                client.login({ username: dockerHubUsername, passwordStdIn: true })
            );
        });

        it('LogoutCommand', async function () {
            if (!dockerHubUsername || !dockerHubPAT) {
                this.skip();
            }

            await defaultRunner.getCommandRunner()(
                client.logout({})
            );
        });
    });

    // #endregion

    // #region Events

    describe('Events', function () {
        let container: string | undefined;

        before('Events', async function () {
            // Create a container so that the event stream has something to report
            container = await defaultRunner.getCommandRunner()(
                client.runContainer({
                    imageRef: 'hello-world:latest',
                    detached: true,
                })
            );
        });

        after('Events', async function () {
            // Cleanup the container created for the event stream
            if (container) {
                await defaultRunner.getCommandRunner()(
                    client.removeContainers({ containers: [container], force: true })
                );
            }
        });

        it('GetEventStreamCommand', async function () {
            const eventStream = defaultRunner.getStreamingCommandRunner()(
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
    });

    // #endregion

    // #region Contexts

    describe('Contexts', function () {
        it('ListContextsCommand', async function () {
            if (clientTypeToTest !== 'docker') {
                this.skip();
            }

            const contexts = await defaultRunner.getCommandRunner()(
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

            // Because we cannot create contexts we won't actually remove one, but we will validate the command line
            const command = await client.removeContexts({ contexts: ['test'] });
            expect(command).to.be.ok;

            expect(getBashCommandLine(command)).to.equal(`${client.commandName} context rm test --force`);
        });

        it('UseContextCommand', async function () {
            if (clientTypeToTest !== 'docker') {
                this.skip();
            }

            await defaultRunner.getCommandRunner()(
                client.useContext({ context: 'default' })
            );
        });

        it('InspectContextsCommand', async function () {
            if (clientTypeToTest !== 'docker') {
                this.skip();
            }

            const context = await defaultRunner.getCommandRunner()(
                client.inspectContexts({ contexts: ['default'] })
            );

            expect(context).to.be.ok;
            expect(context).to.be.an('array');

            context.forEach((ctx) => {
                expect(ctx.name).to.be.a('string');
                expect(ctx.raw).to.be.a('string');
            });

            expect(context.map(c => c.name)).to.include('default');
        });
    });

    // #endregion

    // #region Filesystem

    describe('Filesystem', function () {
        let containerId: string;

        before('Filesystem', async function () {
            containerId = await defaultRunner.getCommandRunner()(
                client.runContainer({
                    imageRef: 'alpine:latest',
                    detached: true,
                })
            ) as string;

            if (!containerId) {
                expect.fail('Failed to create container for filesystem tests');
            }
        });

        after('Filesystem', async function () {
            if (containerId) {
                await defaultRunner.getCommandRunner()(
                    client.removeContainers({ containers: [containerId], force: true })
                );
            }
        });

        it('ListFilesCommand', async function () {
            const files = await defaultRunner.getCommandRunner()(
                client.listFiles({ container: containerId, path: '/etc' })
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
            const stats = await defaultRunner.getCommandRunner()(
                client.statPath({ container: containerId, path: '/etc/hosts' })
            );

            expect(stats).to.be.ok;
            expect(stats!.name).to.be.a('string');
            expect(stats!.path).to.be.a('string');
            expect(stats!.size).to.be.a('number');
            expect(stats!.type).to.equal(FileType.File);
        });

        it('ReadFileCommand', async function () {
            const tarContentStream = defaultRunner.getStreamingCommandRunner()(
                client.readFile({ container: containerId, path: '/etc/hosts' })
            );

            let fileContent: string = "";
            for await (const chunk of tarContentStream) {
                expect(chunk).to.be.ok;
                expect(chunk).to.be.an.instanceOf(Buffer);
                fileContent += chunk.toString();
            }

            // The content is a tarball, but it will contain `localhost` in cleartext
            expect(fileContent).to.be.ok;
            expect(fileContent).to.include('localhost'); // "localhost" seems to always appear in /etc/hosts
        });

        it('WriteFileCommand', async function () {
            const content = 'Hello from the container!';
            const tempFilePath = path.join(os.tmpdir(), 'hello.txt');
            await fs.writeFile(tempFilePath, content);

            await defaultRunner.getCommandRunner()(
                client.writeFile({ container: containerId, path: '/tmp/hello.txt', inputFile: tempFilePath })
            );

            // Verify the file was written
            const tarContentStream = defaultRunner.getStreamingCommandRunner()(
                client.readFile({ container: containerId, path: '/tmp/hello.txt' })
            );

            let fileContent: string = "";
            for await (const chunk of tarContentStream) {
                expect(chunk).to.be.ok;
                expect(chunk).to.be.an.instanceOf(Buffer);
                fileContent += chunk.toString();
            }

            // The content is a tarball, but it will contain the file content in cleartext
            expect(fileContent).to.be.ok;
            expect(fileContent).to.include(content);
        });
    });

    // #endregion
});

// #region Helper Methods

function getBashCommandLine(command: CommandResponseBase): string {
    const bash = new Bash();
    return `${command.command} ${bash.quote(command.args).join(' ')}`;
}

async function validateImageExists(client: IContainersClient, runner: ICommandRunnerFactory, imageRef: string): Promise<boolean> {
    const images = await runner.getCommandRunner()(
        client.listImages({ all: true })
    );

    return images.some(i =>
        i.image.originalName!.includes(imageRef)
    );
}

// #endregion

/* eslint-enable @typescript-eslint/no-non-null-assertion */
