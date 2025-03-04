/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import * as stream from 'stream';
import { FileType } from 'vscode';
import { DockerClient } from '../clients/DockerClient/DockerClient';
import { PodmanClient } from '../clients/PodmanClient/PodmanClient';
import { ShellStreamCommandRunnerFactory, ShellStreamCommandRunnerOptions } from '../commandRunners/shellStream';
import { WslShellCommandRunnerFactory, WslShellCommandRunnerOptions } from '../commandRunners/wslStream';
import { IContainersClient } from '../contracts/ContainerClient';
import { CommandResponseBase, ICommandRunnerFactory } from '../contracts/CommandRunner';
import { Bash } from '../utils/spawnStreamAsync';

// Modify the below options to configure the tests
const clientTypeToTest: 'docker' | 'podman' = 'docker';
const runnerTypeToTest: 'shell' | 'wsl' = 'shell';

// Supply to run the login/logout tests
const dockerHubUsername = '';
const dockerHubPAT = ''; // Never commit this value!!

// No need to modify below this

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe('(integration) ContainersClientE2E', function () {

    // #region Test Setup
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

    // #endregion

    // #region Images

    describe('Images', function () {
        before('Images', async function () {
            // Pull a small image for testing
            await defaultRunnerFactory.getCommandRunner()(
                client.pullImage({ imageRef: 'alpine:latest' })
            );
        });

        it('ListImagesCommand', async function () {
            const images = await defaultRunnerFactory.getCommandRunner()(
                client.listImages({ all: true })
            );

            expect(images).to.be.ok;
            expect(images).to.be.an('array');

            expect(images.length).to.be.greaterThan(0);
            images.forEach((image) => {
                expect(image.id).to.be.a('string');
                expect(image.image).to.be.an('object');
                expect(image.createdAt).to.be.instanceOf(Date);
            });

            // Make sure we can find the alpine image we pulled
            expect(images.some(i =>
                i.image.image?.includes('alpine') ||
                i.image.originalName?.includes('alpine')
            )).to.be.true;
        });

        it('TagImageCommand', async function () {
            const testTag = 'test-image:latest';

            // Tag the alpine image with our test name
            await defaultRunnerFactory.getCommandRunner()(
                client.tagImage({
                    fromImageRef: 'alpine:latest',
                    toImageRef: testTag
                })
            );

            // Verify it was tagged
            const taggedImages = await defaultRunnerFactory.getCommandRunner()(
                client.listImages({ all: true })
            );

            expect(taggedImages).to.be.ok;
            expect(taggedImages).to.be.an('array');
            expect(taggedImages.length).to.be.greaterThan(0);

            expect(taggedImages.some(i =>
                i.image.image?.includes(testTag) ||
                i.image.originalName?.includes(testTag)
            )).to.be.true;
        });

        it('InspectImagesCommand', async function () {
            // Ensure we have a valid image ID
            expect(testImageId).to.be.a('string');

            // Inspect the image
            const images = await defaultRunnerFactory.getCommandRunner()(
                client.inspectImages({ imageRefs: [testImageId!] })
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
            const buildOptions = {
                path: '.',
                tags: 'build-test-image:latest',
                customOptions: '--build-arg TEST_ARG=value',
                pull: false
            };

            // Since we can't actually build without a Dockerfile, we'll just verify the command generation
            const command = await client.buildImage(buildOptions);
            expect(command).to.be.ok;
            expect(command.args).to.be.an('array');

            // We expect 'build', the path, and the tag at a minimum
            expect(command.args).to.include.members(['build', '.']);
            expect(command.args.some(arg => arg.includes('build-test-image:latest'))).to.be.true;
        });

        it('PullImageCommand', async function () {
            // We already tested pull in the setup, let's make sure the command works
            await defaultRunnerFactory.getCommandRunner()(
                client.pullImage({ imageRef: 'hello-world:latest' })
            );

            // Verify it was pulled
            const images = await defaultRunnerFactory.getCommandRunner()(
                client.listImages({ references: ['hello-world:latest'] })
            );

            expect(images).to.be.ok;
            expect(images).to.be.an('array');
            expect(images.length).to.be.greaterThan(0);
        });

        it('PushImageCommand', async function () {
            // Since we can't actually push without credentials, we'll verify the command generation
            const command = await client.pushImage({ imageRef: 'test-image:latest' });
            expect(command).to.be.ok;
            expect(command.args).to.be.an('array');

            // We expect push and the image reference
            expect(command.args).to.include.members(['push', 'test-image:latest']);
        });

        it('RemoveImagesCommand', async function () {
            // Make sure we have a tagged image to remove
            expect(testImageId).to.be.a('string');

            // Remove the image using our tag
            const removedImages = await defaultRunnerFactory.getCommandRunner()(
                client.removeImages({ imageRefs: [testImageRef], force: true })
            );

            expect(removedImages).to.be.ok;
            expect(removedImages).to.be.an('array');

            // Verify it was removed
            const images = await defaultRunnerFactory.getCommandRunner()(
                client.listImages({ references: [testImageRef] })
            );
            expect(images).to.be.an('array');
            expect(images.length).to.equal(0);
        });

        it('PruneImagesCommand', async function () {
            // Run image prune
            const pruneResult = await defaultRunnerFactory.getCommandRunner()(
                client.pruneImages({ all: false })
            );

            expect(pruneResult).to.be.ok;
            if (pruneResult.imageRefsDeleted) {
                expect(pruneResult.imageRefsDeleted).to.be.an('array');
            }
            if (pruneResult.spaceReclaimed !== undefined) {
                expect(pruneResult.spaceReclaimed).to.be.a('number').greaterThan(0);
            }
        });
    });

    // #endregion

    // #region Containers

    describe('Containers', function () {
        let testContainerId: string | undefined;
        let testContainerId2: string | undefined;

        before('Containers', async function () {
            // Ensure alpine image is available
            try {
                await defaultRunnerFactory.getCommandRunner()(
                    client.pullImage({ imageRef: 'alpine:latest' })
                );
            } catch (error) {
                console.log('Failed to pull alpine image, may already exist');
            }
        });

        after('Containers', async function () {
            // Clean up any containers we created
            try {
                if (testContainerId) {
                    await defaultRunnerFactory.getCommandRunner()(
                        client.removeContainers({ containers: [testContainerId], force: true })
                    );
                }
                if (testContainerId2) {
                    await defaultRunnerFactory.getCommandRunner()(
                        client.removeContainers({ containers: [testContainerId2], force: true })
                    );
                }
            } catch (error) {
                console.log('Error during container cleanup:', error);
            }
        });

        it('RunContainerCommand', async function () {
            // Create a container that will stay running
            testContainerId = await defaultRunnerFactory.getCommandRunner()(
                client.runContainer({
                    imageRef: 'alpine:latest',
                    detached: true,
                    command: ['sleep', '30'],
                    name: 'test-container-e2e'
                })
            );

            expect(testContainerId).to.be.a('string');
            expect(testContainerId!.length).to.be.greaterThan(0);
        });

        it('ListContainersCommand', async function () {
            // Ensure we have a running container
            expect(testContainerId).to.be.a('string');

            const containers = await defaultRunnerFactory.getCommandRunner()(
                client.listContainers({ all: true })
            );

            expect(containers).to.be.ok;
            expect(containers).to.be.an('array');
            expect(containers.length).to.be.greaterThan(0);

            // Verify our test container is in the list
            const testContainer = containers.find(c => c.id === testContainerId);
            expect(testContainer).to.be.ok;
            expect(testContainer!.name).to.equal('test-container-e2e');
            expect(testContainer!.image).to.be.an('object');
            expect(testContainer!.state).to.be.a('string');
            expect(testContainer!.labels).to.be.an('object');
            expect(testContainer!.createdAt).to.be.instanceOf(Date);
        });

        it('InspectContainersCommand', async function () {
            // Ensure we have a container to inspect
            expect(testContainerId).to.be.a('string');

            const containers = await defaultRunnerFactory.getCommandRunner()(
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
            const commandStream = defaultRunnerFactory.getStreamingCommandRunner()(
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
            await defaultRunnerFactory.getStreamingCommandRunner()(
                client.execContainer({
                    container: testContainerId!,
                    command: ['sh', '-c', 'echo "Log entry for testing" >&2']
                })
            );

            // Get logs
            const logsStream = defaultRunnerFactory.getStreamingCommandRunner()(
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
            const stoppedContainers = await defaultRunnerFactory.getCommandRunner()(
                client.stopContainers({ container: [testContainerId!] })
            );

            expect(stoppedContainers).to.be.ok;
            expect(stoppedContainers).to.be.an('array');
            expect(stoppedContainers).to.include(testContainerId);

            // Verify it's stopped
            const containers = await defaultRunnerFactory.getCommandRunner()(
                client.listContainers({ all: true })
            );
            const testContainer = containers.find(c => c.id === testContainerId);
            expect(testContainer!.state.toLowerCase()).to.not.equal('running');
        });

        it('StartContainersCommand', async function () {
            // Ensure we have a stopped container
            expect(testContainerId).to.be.a('string');

            // Start the container
            const startedContainers = await defaultRunnerFactory.getCommandRunner()(
                client.startContainers({ container: [testContainerId!] })
            );

            expect(startedContainers).to.be.ok;
            expect(startedContainers).to.be.an('array');
            expect(startedContainers).to.include(testContainerId);

            // Verify it's running
            const containers = await defaultRunnerFactory.getCommandRunner()(
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
            const restartedContainers = await defaultRunnerFactory.getCommandRunner()(
                client.restartContainers({ container: [testContainerId!] })
            );

            expect(restartedContainers).to.be.ok;
            expect(restartedContainers).to.be.an('array');
            expect(restartedContainers).to.include(testContainerId);

            // Verify it's running
            const containers = await defaultRunnerFactory.getCommandRunner()(
                client.listContainers({ all: false })
            );
            const testContainer = containers.find(c => c.id === testContainerId);
            expect(testContainer).to.be.ok;
            expect(testContainer!.state.toLowerCase()).to.equal('running');
        });

        it('StatsContainersCommand', async function () {
            // Get container stats
            const stats = await defaultRunnerFactory.getCommandRunner()(
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
            testContainerId2 = await defaultRunnerFactory.getCommandRunner()(
                client.runContainer({
                    imageRef: 'alpine:latest',
                    detached: true,
                    command: ['sleep', '1'],
                    name: 'test-container-e2e-2'
                })
            );

            expect(testContainerId2).to.be.a('string');

            // Remove the containers
            const removedContainers = await defaultRunnerFactory.getCommandRunner()(
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
            const pruneResult = await defaultRunnerFactory.getCommandRunner()(
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

    describe('Networks', function () {
        const testNetworkName = 'test-network-e2e';

        after('Networks', async function () {
            try {
                // Clean up test network if it exists
                const networks = await defaultRunnerFactory.getCommandRunner()(
                    client.listNetworks({})
                );

                if (networks.some(n => n.name === testNetworkName)) {
                    await defaultRunnerFactory.getCommandRunner()(
                        client.removeNetworks({ networks: [testNetworkName] })
                    );
                }
            } catch (error) {
                console.log('Error cleaning up test network:', error);
            }
        });

        it('CreateNetworkCommand', async function () {
            // Create a test network
            await defaultRunnerFactory.getCommandRunner()(
                client.createNetwork({ name: testNetworkName })
            );

            // Verify it was created
            const networks = await defaultRunnerFactory.getCommandRunner()(
                client.listNetworks({})
            );

            expect(networks.some(n => n.name === testNetworkName)).to.be.true;
        });

        it('ListNetworksCommand', async function () {
            const networks = await defaultRunnerFactory.getCommandRunner()(
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
            const networks = await defaultRunnerFactory.getCommandRunner()(
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
            const removedNetworks = await defaultRunnerFactory.getCommandRunner()(
                client.removeNetworks({ networks: [testNetworkName] })
            );

            expect(removedNetworks).to.be.ok;
            expect(removedNetworks).to.be.an('array');
            expect(removedNetworks).to.include(testNetworkName);

            // Verify it was removed
            const networks = await defaultRunnerFactory.getCommandRunner()(
                client.listNetworks({})
            );
            expect(networks.some(n => n.name === testNetworkName)).to.be.false;
        });

        it('PruneNetworksCommand', async function () {
            const pruneResult = await defaultRunnerFactory.getCommandRunner()(
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

    describe('Volumes', function () {
        const testVolumeName = 'test-volume-e2e';

        after('Volumes', async function () {
            try {
                // Clean up test volume if it exists
                const volumes = await defaultRunnerFactory.getCommandRunner()(
                    client.listVolumes({})
                );

                if (volumes.some(v => v.name === testVolumeName)) {
                    await defaultRunnerFactory.getCommandRunner()(
                        client.removeVolumes({ volumes: [testVolumeName] })
                    );
                }
            } catch (error) {
                console.log('Error cleaning up test volume:', error);
            }
        });

        it('CreateVolumeCommand', async function () {
            // Create a test volume
            await defaultRunnerFactory.getCommandRunner()(
                client.createVolume({ name: testVolumeName })
            );

            // Verify it was created
            const volumes = await defaultRunnerFactory.getCommandRunner()(
                client.listVolumes({})
            );

            expect(volumes.some(v => v.name === testVolumeName)).to.be.true;
        });

        it('ListVolumesCommand', async function () {
            const volumes = await defaultRunnerFactory.getCommandRunner()(
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
            const volumes = await defaultRunnerFactory.getCommandRunner()(
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
            const removedVolumes = await defaultRunnerFactory.getCommandRunner()(
                client.removeVolumes({ volumes: [testVolumeName] })
            );

            expect(removedVolumes).to.be.ok;
            expect(removedVolumes).to.be.an('array');
            expect(removedVolumes).to.include(testVolumeName);

            // Verify it was removed
            const volumes = await defaultRunnerFactory.getCommandRunner()(
                client.listVolumes({})
            );
            expect(volumes.some(v => v.name === testVolumeName)).to.be.false;
        });

        it('PruneVolumesCommand', async function () {
            const pruneResult = await defaultRunnerFactory.getCommandRunner()(
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

    // #endregion

    // #region Events

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

        after('Events', async function () {
            // Cleanup the container created for the event stream
            if (container) {
                await defaultRunnerFactory.getCommandRunner()(
                    client.removeContainers({ containers: [container], force: true })
                );
            }
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
    });

    // #endregion

    // #region Contexts

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

            // Because we cannot create contexts we won't actually remove one, but we will validate the command line
            const command = await client.removeContexts({ contexts: ['test'] });
            expect(command).to.be.ok;

            expect(getBashCommandLine(command)).to.equal(`${client.commandName} context rm test --force`);
        });

        it('UseContextCommand', async function () {
            if (clientTypeToTest !== 'docker') {
                this.skip();
            }

            await defaultRunnerFactory.getCommandRunner()(
                client.useContext({ context: 'default' })
            );
        });

        it('InspectContextsCommand', async function () {
            if (clientTypeToTest !== 'docker') {
                this.skip();
            }

            const context = await defaultRunnerFactory.getCommandRunner()(
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

        after('Filesystem', async function () {
            if (containerId) {
                await defaultRunnerFactory.getCommandRunner()(
                    client.removeContainers({ containers: [containerId], force: true })
                );
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
            expect.fail('TODO');
        });
    });

    // #endregion
});

// #region Helper Methods

function getBashCommandLine(command: CommandResponseBase): string {
    const bash = new Bash();
    return bash.quote(command.args).join(' ');
}

// #endregion

/* eslint-enable @typescript-eslint/no-non-null-assertion */
