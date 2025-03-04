/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as stream from 'stream';
import * as fs from 'fs';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { PodmanClient } from '../clients/PodmanClient/PodmanClient';
import { DockerClient } from '../clients/DockerClient/DockerClient';
import { ShellStreamCommandRunnerFactory, ShellStreamCommandRunnerOptions } from '../commandRunners/shellStream';
import { WslShellCommandRunnerFactory } from '../commandRunners/wslStream';
import { wslifyPath } from '../utils/wslifyPath';
import { IContainersClient } from '../contracts/ContainerClient';
import { ContainerOS } from '../contracts/ContainerClient';

// Configuration Options
const testDockerUsername = ''; // Supply a value for this to run the login/logout tests
const testDockerPat = ''; // Supply a value for this to run the login/logout tests
const useWsl = false; // Set to true to run tests in WSL
const clientType: 'docker' | 'podman' = 'docker'; // Which client to test

// Test resources
let client: IContainersClient;
let runner: ShellStreamCommandRunnerFactory<ShellStreamCommandRunnerOptions> | WslShellCommandRunnerFactory;
let testDockerfileContext: string = path.resolve(__dirname, 'buildContext');
let testDockerfile: string = path.resolve(testDockerfileContext, 'Dockerfile');
let testContainerId: string;
let testImageId: string;
let testVolumeName: string;
let testNetworkName: string;
let testOs: ContainerOS = 'linux';

// Setup for test file existence
const dockerfilePath = path.resolve(testDockerfileContext, 'Dockerfile');
if (!fs.existsSync(testDockerfileContext)) {
    fs.mkdirSync(testDockerfileContext, { recursive: true });
}
if (!fs.existsSync(dockerfilePath)) {
    fs.writeFileSync(dockerfilePath, 'FROM alpine:latest\nCMD ["echo", "Hello World"]\n');
}

// Setup client and runner
before(function () {
    if (clientType === 'docker') {
        client = new DockerClient();
    } else if (clientType === 'podman') {
        client = new PodmanClient();
    } else {
        throw new Error(`Unknown client type: ${clientType}`);
    }

    if (useWsl) {
        runner = new WslShellCommandRunnerFactory({ strict: true });
        testDockerfileContext = wslifyPath(testDockerfileContext);
        testDockerfile = wslifyPath(testDockerfile);
    } else {
        runner = new ShellStreamCommandRunnerFactory({ strict: true });
    }

    // Generate unique names for test resources
    const uniqueId = Date.now().toString();
    testVolumeName = `test-volume-${uniqueId}`;
    testNetworkName = `test-network-${uniqueId}`;

    this.timeout(30000); // Allow time for setup
});

// Clean up resources after all tests
after(async function () {
    this.timeout(30000); // Allow time for cleanup

    try {
        // Clean up containers
        if (testContainerId) {
            try {
                await runner.getCommandRunner()(client.stopContainers({ container: [testContainerId], time: 1 }));
            } catch (err) {
                console.log(`Warning: Failed to stop container ${testContainerId}: ${err}`);
            }

            try {
                await runner.getCommandRunner()(client.removeContainers({ containers: [testContainerId], force: true }));
            } catch (err) {
                console.log(`Warning: Failed to remove container ${testContainerId}: ${err}`);
            }
        }

        // Clean up test image
        if (testImageId) {
            try {
                await runner.getCommandRunner()(client.removeImages({ imageRefs: [testImageId], force: true }));
            } catch (err) {
                console.log(`Warning: Failed to remove image ${testImageId}: ${err}`);
            }
        }

        // Clean up test volume
        try {
            await runner.getCommandRunner()(client.removeVolumes({ volumes: [testVolumeName], force: true }));
        } catch (err) {
            console.log(`Warning: Failed to remove volume ${testVolumeName}: ${err}`);
        }

        // Clean up test network
        try {
            await runner.getCommandRunner()(client.removeNetworks({ networks: [testNetworkName], force: true }));
        } catch (err) {
            console.log(`Warning: Failed to remove network ${testNetworkName}: ${err}`);
        }
    } catch (err) {
        console.log(`Warning during cleanup: ${err}`);
    }
});

describe('Container Client End-to-End Tests', function () {
    this.timeout(10000); // Default timeout for all tests

    describe('Client Identity and Metadata', () => {
        it('has correct client identity properties', () => {
            expect(client.id).to.be.a('string');
            expect(client.displayName).to.be.a('string');
            expect(client.description).to.be.a('string');
            expect(client.commandName).to.be.a('string');
        });

        it('has correct image name defaults', () => {
            expect(client.defaultRegistry).to.be.a('string');
            expect(client.defaultTag).to.be.a('string');
        });
    });

    describe('Basic Commands', () => {
        it('version() returns client and server versions', async () => {
            const version = await runner.getCommandRunner()(client.version({}));
            expect(version.client).to.be.a('string');
            // Server version may be undefined in some cases
        });

        it('checkInstall() confirms client is installed', async () => {
            const result = await runner.getCommandRunner()(client.checkInstall({}));
            expect(result).to.be.a('string');
        });

        it('info() returns system information', async () => {
            const info = await runner.getCommandRunner()(client.info({}));
            expect(info.osType).to.be.oneOf(['linux', 'windows']);
            expect(info.raw).to.be.a('string');
            // Set the OS for later tests
            if (info.osType) {
                testOs = info.osType;
            }
        });
    });

    describe('Event Stream', () => {
        xit('getEventStream() can stream events', async function () {
            // This is a short test of event streaming that doesn't wait for events
            this.timeout(5000);
            const eventGenerator = runner.getStreamingCommandRunner()(client.getEventStream({ since: "1m" }));

            // Set up a promise that will resolve after receiving an event or timing out
            const timeoutPromise = new Promise(resolve => setTimeout(resolve, 1000));
            const eventPromise = new Promise(async resolve => {
                for await (const event of eventGenerator) {
                    resolve(event);
                    break;
                }
            });

            // Either get an event or timeout
            await Promise.race([eventPromise, timeoutPromise]);
            // We don't expect any particular event, just testing the API works
        });
    });

    describe('Image Operations', () => {
        it('buildImage() successfully builds an image', async function () {
            this.timeout(30000); // Building can take time

            await runner.getCommandRunner()(client.buildImage({
                path: testDockerfileContext,
                file: testDockerfile,
                tags: ['test-e2e:latest']
            }));

            const images = await runner.getCommandRunner()(client.listImages({}));
            const image = images.find(i => i.image.originalName?.includes('test-e2e:latest'));
            expect(image).to.exist;
            if (image) {
                testImageId = image.id; // Save for later tests
            }
        });

        it('listImages() returns a list of images', async () => {
            const images = await runner.getCommandRunner()(client.listImages({}));
            expect(images).to.be.an('array').with.length.greaterThan(0);
            expect(images[0].id).to.be.a('string');
            expect(images[0].image).to.be.an('object');
        });

        it('pullImage() can pull an image', async function () {
            this.timeout(30000); // Pulling can take time

            await runner.getCommandRunner()(client.pullImage({
                imageRef: 'alpine:latest',
                allTags: false
            }));

            const images = await runner.getCommandRunner()(client.listImages({}));
            const alpineImage = images.find(i => i.image.originalName?.includes('alpine:latest'));
            expect(alpineImage).to.exist;
        });

        it('inspectImages() returns image details', async () => {
            expect(testImageId).to.exist;

            const imageInspects = await runner.getCommandRunner()(client.inspectImages({
                imageRefs: [testImageId]
            }));

            expect(imageInspects).to.be.an('array').with.lengthOf(1);
            expect(imageInspects[0].id).to.equal(testImageId);
            expect(imageInspects[0].raw).to.be.a('string');
        });

        it('tagImage() adds a new tag to an image', async () => {
            expect(testImageId).to.exist;

            await runner.getCommandRunner()(client.tagImage({
                fromImageRef: testImageId,
                toImageRef: 'test-e2e:tagged'
            }));

            const images = await runner.getCommandRunner()(client.listImages({}));
            const taggedImage = images.find(i => i.image.originalName?.includes('test-e2e:tagged'));
            expect(taggedImage).to.exist;
        });
    });

    describe('Container Operations', () => {
        it('runContainer() creates and starts a container', async () => {
            testContainerId = await runner.getCommandRunner()(client.runContainer({
                imageRef: 'alpine:latest',
                detached: true,
                labels: {
                    "test": "e2e"
                },
                command: ["sleep", "3600"]
            })) as string;

            expect(testContainerId).to.be.a('string');
        });

        it('listContainers() lists running containers', async () => {
            const containers = await runner.getCommandRunner()(client.listContainers({}));
            expect(containers).to.be.an('array').with.length.greaterThan(0);

            const testContainer = containers.find(c => c.id === testContainerId);
            expect(testContainer).to.exist;
        });

        it('inspectContainers() returns container details', async () => {
            const inspected = await runner.getCommandRunner()(client.inspectContainers({
                containers: [testContainerId]
            }));

            expect(inspected).to.be.an('array').with.lengthOf(1);
            expect(inspected[0].id).to.equal(testContainerId);
            expect(inspected[0].labels.test).to.equal('e2e');
        });

        xit('execContainer() executes a command in the container', async () => {
            const execOutput = await new Promise<string>(async resolve => {
                let output = '';
                const execGenerator = runner.getStreamingCommandRunner()(client.execContainer({
                    container: testContainerId,
                    command: ["echo", "Hello", "World"]
                }));

                for await (const chunk of execGenerator) {
                    output += chunk;
                }
                resolve(output.trim());
            });

            expect(execOutput).to.equal('Hello World');
        });

        it('stopContainers() stops a running container', async () => {
            const stopped = await runner.getCommandRunner()(client.stopContainers({
                container: [testContainerId],
                time: 1
            }));

            expect(stopped).to.be.an('array').with.lengthOf(1);
            expect(stopped[0]).to.equal(testContainerId);

            const containers = await runner.getCommandRunner()(client.listContainers({ all: true }));
            const testContainer = containers.find(c => c.id === testContainerId);
            expect(testContainer?.state).to.not.equal('running');
        });

        it('startContainers() starts a stopped container', async () => {
            const started = await runner.getCommandRunner()(client.startContainers({
                container: [testContainerId]
            }));

            expect(started).to.be.an('array').with.lengthOf(1);
            expect(started[0]).to.equal(testContainerId);

            const containers = await runner.getCommandRunner()(client.listContainers({}));
            const testContainer = containers.find(c => c.id === testContainerId);
            expect(testContainer?.state).to.equal('running');
        });

        it('restartContainers() restarts a running container', async () => {
            const restarted = await runner.getCommandRunner()(client.restartContainers({
                container: [testContainerId]
            }));

            expect(restarted).to.be.an('array').with.lengthOf(1);
            expect(restarted[0]).to.equal(testContainerId);
        });

        xit('logsForContainer() returns container logs', async () => {
            // First execute a command that will produce logs
            await runner.getStreamingCommandRunner()(client.execContainer({
                container: testContainerId,
                command: ["echo", "Test log entry"]
            }));

            const logs = await new Promise<string>(async resolve => {
                let output = '';
                const logsGenerator = runner.getStreamingCommandRunner()(client.logsForContainer({
                    container: testContainerId,
                    tail: 10
                }));

                for await (const chunk of logsGenerator) {
                    output += chunk;
                }
                resolve(output.trim());
            });

            // The logs should contain our test entry
            expect(logs).to.include('Test log entry');
        });

        it('statsContainers() returns container stats', async () => {
            const stats = await runner.getCommandRunner()(client.statsContainers({
                all: false
            }));

            expect(stats).to.be.a('string');
            expect(stats).to.not.be.empty;
        });
    });

    describe('Volume Operations', () => {
        it('createVolume() creates a new volume', async () => {
            await runner.getCommandRunner()(client.createVolume({
                name: testVolumeName
            }));

            // Verify the volume was created
            const volumes = await runner.getCommandRunner()(client.listVolumes({}));
            const testVolume = volumes.find(v => v.name === testVolumeName);
            expect(testVolume).to.exist;
        });

        it('listVolumes() lists volumes', async () => {
            const volumes = await runner.getCommandRunner()(client.listVolumes({}));
            expect(volumes).to.be.an('array').with.length.greaterThan(0);

            const testVolume = volumes.find(v => v.name === testVolumeName);
            expect(testVolume).to.exist;
        });

        it('inspectVolumes() returns volume details', async () => {
            const volumeInspects = await runner.getCommandRunner()(client.inspectVolumes({
                volumes: [testVolumeName]
            }));

            expect(volumeInspects).to.be.an('array').with.lengthOf(1);
            expect(volumeInspects[0].name).to.equal(testVolumeName);
            expect(volumeInspects[0].raw).to.be.a('string');
        });
    });

    describe('Network Operations', () => {
        it('createNetwork() creates a new network', async () => {
            await runner.getCommandRunner()(client.createNetwork({
                name: testNetworkName
            }));

            // Verify the network was created
            const networks = await runner.getCommandRunner()(client.listNetworks({}));
            const testNetwork = networks.find(n => n.name === testNetworkName);
            expect(testNetwork).to.exist;
        });

        it('listNetworks() lists networks', async () => {
            const networks = await runner.getCommandRunner()(client.listNetworks({}));
            expect(networks).to.be.an('array').with.length.greaterThan(0);

            const testNetwork = networks.find(n => n.name === testNetworkName);
            expect(testNetwork).to.exist;
        });

        it('inspectNetworks() returns network details', async () => {
            const networkInspects = await runner.getCommandRunner()(client.inspectNetworks({
                networks: [testNetworkName]
            }));

            expect(networkInspects).to.be.an('array').with.lengthOf(1);
            expect(networkInspects[0].name).to.equal(testNetworkName);
            expect(networkInspects[0].raw).to.be.a('string');
        });
    });

    describe('Context Operations', () => {
        it('listContexts() lists available contexts', async function () {
            // Some environments might not support contexts
            try {
                const contexts = await runner.getCommandRunner()(client.listContexts({}));
                expect(contexts).to.be.an('array');
                // At least default context should be available
                expect(contexts.length).to.be.greaterThan(0);
                expect(contexts[0].name).to.be.a('string');
            } catch (err) {
                this.skip();
            }
        });

        it('inspectContexts() returns context details', async function () {
            // Some environments might not support contexts
            try {
                const contexts = await runner.getCommandRunner()(client.listContexts({}));
                if (contexts.length === 0) {
                    this.skip();
                }

                const contextInspects = await runner.getCommandRunner()(client.inspectContexts({
                    contexts: [contexts[0].name]
                }));

                expect(contextInspects).to.be.an('array').with.lengthOf(1);
                expect(contextInspects[0].name).to.equal(contexts[0].name);
                expect(contextInspects[0].raw).to.be.a('string');
            } catch (err) {
                this.skip();
            }
        });
    });

    describe('Authentication Operations', () => {
        it('login() and logout() manage registry authentication', async function () {
            if (!testDockerUsername || !testDockerPat) {
                this.skip();
            }

            // Create a stream to write the PAT into
            const stdInPipe = stream.Readable.from(testDockerPat);
            const authRunner = useWsl ?
                new WslShellCommandRunnerFactory({ strict: true, stdInPipe }) :
                new ShellStreamCommandRunnerFactory({ strict: true, stdInPipe });

            // Log in
            await authRunner.getCommandRunner()(client.login({
                registry: 'docker.io',
                username: testDockerUsername,
                passwordStdIn: true
            }));

            // Log out
            await runner.getCommandRunner()(client.logout({
                registry: 'docker.io'
            }));
        });
    });

    describe('Filesystem Operations', () => {
        it('listFiles() lists files in a container directory', async () => {
            const files = await runner.getCommandRunner()(client.listFiles({
                container: testContainerId,
                path: '/etc',
                operatingSystem: testOs
            }));

            expect(files).to.be.an('array').with.length.greaterThan(0);
            expect(files[0].name).to.be.a('string');
            expect(files[0].path).to.be.a('string');
        });

        it('statPath() returns file information', async () => {
            const stat = await runner.getCommandRunner()(client.statPath({
                container: testContainerId,
                path: '/etc/hosts',
                operatingSystem: testOs
            }));

            expect(stat).to.exist;
            if (stat) {
                expect(stat.name).to.equal('hosts');
                expect(stat.path).to.equal('/etc/hosts');
                expect(stat.size).to.be.a('number');
                expect(stat.type).to.equal(1); // FileType.File
            }
        });

        xit('readFile() reads file content', async () => {
            const fileContent = await new Promise<string>(async resolve => {
                let content = '';
                const fileGenerator = runner.getStreamingCommandRunner()(client.readFile({
                    container: testContainerId,
                    path: '/etc/hosts',
                    operatingSystem: testOs
                }));

                for await (const chunk of fileGenerator) {
                    content += chunk.toString('utf-8');
                }
                resolve(content);
            });

            // The hosts file should have some content
            expect(fileContent).to.not.be.empty;
            if (testOs === 'linux') {
                // Linux hosts file typically contains localhost entries
                expect(fileContent).to.match(/localhost/);
            }
        });

        xit('writeFile() writes content to a container', async function () {
            if (testOs !== 'linux') {
                this.skip(); // writeFile is not supported on Windows containers
            }

            // Create a simple test file
            const testFilePath = path.join(testDockerfileContext, 'test.txt');
            fs.writeFileSync(testFilePath, 'Hello from E2E test!');

            // Write the file to the container
            await runner.getCommandRunner()(client.writeFile({
                container: testContainerId,
                path: '/tmp',
                inputFile: testFilePath,
                operatingSystem: 'linux'
            }));

            // Read back the file to verify it was written
            const fileContent = await new Promise<string>(async resolve => {
                let content = '';
                const fileGenerator = runner.getStreamingCommandRunner()(client.readFile({
                    container: testContainerId,
                    path: '/tmp/test.txt',
                    operatingSystem: 'linux'
                }));

                for await (const chunk of fileGenerator) {
                    content += chunk.toString('utf-8');
                }
                resolve(content);
            });

            // Clean up the test file
            fs.unlinkSync(testFilePath);

            expect(fileContent).to.contain('Hello from E2E test!');
        });
    });

    describe('Prune Operations', () => {
        // Run these tests last since they clean up resources

        it('pruneNetworks() removes unused networks', async function () {
            // Create a disposable network for pruning
            const tempNetworkName = `${testNetworkName}-prune`;
            await runner.getCommandRunner()(client.createNetwork({
                name: tempNetworkName
            }));

            // Prune networks
            const result = await runner.getCommandRunner()(client.pruneNetworks({}));
            expect(result).to.exist;
            expect(result.networksDeleted).to.be.an('array');
            // The network should be in the deleted list
            expect(result.networksDeleted?.includes(tempNetworkName)).to.be.true;
        });

        it('pruneVolumes() removes unused volumes', async function () {
            // Create a disposable volume for pruning
            const tempVolumeName = `${testVolumeName}-prune`;
            await runner.getCommandRunner()(client.createVolume({
                name: tempVolumeName
            }));

            // Prune volumes
            const result = await runner.getCommandRunner()(client.pruneVolumes({}));
            expect(result).to.exist;
            expect(result.volumesDeleted).to.be.an('array');
            // The volume should be in the deleted list
            expect(result.volumesDeleted?.includes(tempVolumeName)).to.be.true;
        });

        it('pruneContainers() removes stopped containers', async function () {
            // Create a disposable container for pruning
            const tempContainer = await runner.getCommandRunner()(client.runContainer({
                imageRef: 'alpine:latest',
                detached: true,
                command: ["echo", "prune test"]
            })) as string;

            expect(tempContainer).to.be.a('string');

            // Stop the container
            await runner.getCommandRunner()(client.stopContainers({
                container: [tempContainer],
                time: 1
            }));

            // Prune containers
            const result = await runner.getCommandRunner()(client.pruneContainers({}));
            expect(result).to.exist;
            expect(result.containersDeleted).to.be.an('array');
            // The container should be in the deleted list
            expect(result.containersDeleted?.includes(tempContainer)).to.be.true;
        });

        it('pruneImages() removes unused images', async function () {
            // We'll build an untagged image for pruning
            await runner.getCommandRunner()(client.buildImage({
                path: testDockerfileContext,
                file: testDockerfile,
                // No tags - this will create an untagged (dangling) image
            }));

            // Prune images
            const result = await runner.getCommandRunner()(client.pruneImages({}));
            expect(result).to.exist;
            expect(result.imageRefsDeleted).to.be.an('array');
            expect(result.imageRefsDeleted?.length).to.be.greaterThan(0);
            expect(result.spaceReclaimed).to.be.a('number');
        });

        it('removeContainers() removes a container', async () => {
            const removed = await runner.getCommandRunner()(client.removeContainers({
                containers: [testContainerId],
                force: true
            }));

            expect(removed).to.be.an('array').with.lengthOf(1);
            expect(removed[0]).to.equal(testContainerId);

            // For cleanup
            testContainerId = '';
        });

        it('removeImages() removes an image', async () => {
            const removed = await runner.getCommandRunner()(client.removeImages({
                imageRefs: [testImageId],
                force: true
            }));

            expect(removed).to.be.an('array').with.length.greaterThan(0);
            expect(removed).to.include(testImageId);

            // For cleanup
            testImageId = '';
        });

        it('removeVolumes() removes a volume', async () => {
            const removed = await runner.getCommandRunner()(client.removeVolumes({
                volumes: [testVolumeName],
                force: true
            }));

            expect(removed).to.be.an('array').with.lengthOf(1);
            expect(removed[0]).to.equal(testVolumeName);

            // For cleanup
            testVolumeName = '';
        });

        it('removeNetworks() removes a network', async () => {
            const removed = await runner.getCommandRunner()(client.removeNetworks({
                networks: [testNetworkName],
                force: true
            }));

            expect(removed).to.be.an('array').with.lengthOf(1);
            expect(removed[0]).to.equal(testNetworkName);

            // For cleanup
            testNetworkName = '';
        });
    });
});
