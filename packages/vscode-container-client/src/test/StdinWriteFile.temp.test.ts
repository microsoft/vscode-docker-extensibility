/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//
// TEMPORARY one-off test — DELETE before merge.
//
// Purpose: prove the stdin write path (`cp - <container>:<path>`) works end-to-end
// against a real runtime, without adding a tar library. We obtain a genuine tarball
// by reading a file back out of the container (`readFile`), then stream those exact
// bytes into a *different* directory via `writeFile` (no `inputFile`), and read it
// back to confirm the streamed bytes created the file.
//
// Run on a Unix/Mac box with Docker running:
//   cd packages/vscode-container-client
//   npx mocha --grep "TEMP stdin writeFile"
//
// (Docker is the default runtime; no env vars required.)
//

import { NoShell } from '@microsoft/vscode-processutils';
import { expect } from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as stream from 'stream';
import { DockerClient } from '../clients/DockerClient/DockerClient';
import { ShellStreamCommandRunnerFactory, ShellStreamCommandRunnerOptions } from '../commandRunners/shellStream';
import { IContainersClient } from '../contracts/ContainerClient';
import { ICommandRunnerFactory } from '../contracts/CommandRunner';

const KeepAliveShellCommand = "trap 'exit 0' TERM; while true; do sleep 1; done";

describe('(integration) TEMP stdin writeFile', function () {
    this.timeout(30000);

    let client: IContainersClient;
    let defaultRunnerFactory: (options: ShellStreamCommandRunnerOptions) => ICommandRunnerFactory;
    let defaultRunner: ICommandRunnerFactory;
    let containerId: string;

    before(async function () {
        client = new DockerClient();
        defaultRunnerFactory = (options: ShellStreamCommandRunnerOptions) => new ShellStreamCommandRunnerFactory(options);
        defaultRunner = defaultRunnerFactory({ strict: true, shellProvider: new NoShell() });

        await defaultRunner.getCommandRunner()(
            client.pullImage({ imageRef: 'alpine:latest' })
        );

        containerId = (await defaultRunner.getCommandRunner()(
            client.runContainer({
                imageRef: 'alpine:latest',
                detached: true,
                entrypoint: 'sh',
                command: ['-c', KeepAliveShellCommand],
            })
        ))!;

        expect(containerId, 'container should have started').to.be.ok;
    });

    after(async function () {
        if (containerId) {
            await defaultRunner.getCommandRunner()(
                client.removeContainers({ containers: [containerId], force: true })
            );
        }
    });

    it('streams a tarball to stdin (cp -) and writes the file', async function () {
        const content = `Streamed via stdin! ${Date.now()}`;
        const tempFilePath = path.join(os.tmpdir(), 'streamed.txt');
        await fs.writeFile(tempFilePath, content);

        // Seed /tmp/streamed.txt via the host-side inputFile copy (setup only).
        await defaultRunner.getCommandRunner()(
            client.writeFile({ container: containerId, path: '/tmp/streamed.txt', inputFile: tempFilePath })
        );

        // Read it back out as a real tarball (entry name: `streamed.txt`).
        const readBackStream = defaultRunner.getStreamingCommandRunner()(
            client.readFile({ container: containerId, path: '/tmp/streamed.txt' })
        );

        const tarChunks: Buffer[] = [];
        for await (const chunk of readBackStream) {
            tarChunks.push(chunk);
        }
        const tarball = Buffer.concat(tarChunks);
        expect(tarball.length, 'tarball should be non-empty').to.be.greaterThan(0);

        // THE PATH UNDER TEST: stream the tarball into /root via stdin.
        // No `inputFile` -> `cp - <container>:/root`, extracting to /root/streamed.txt.
        const stdInPipe = stream.Readable.from([tarball]);
        const streamingRunnerFactory = defaultRunnerFactory({ stdInPipe, shellProvider: new NoShell() });
        await streamingRunnerFactory.getCommandRunner()(
            client.writeFile({ container: containerId, path: '/root' })
        );

        // Verify the streamed file landed in the new directory.
        const verifyStream = defaultRunner.getStreamingCommandRunner()(
            client.readFile({ container: containerId, path: '/root/streamed.txt' })
        );

        let fileContent = '';
        for await (const chunk of verifyStream) {
            fileContent += chunk.toString();
        }

        expect(fileContent, 'streamed file content should read back').to.include(content);
    });
});
