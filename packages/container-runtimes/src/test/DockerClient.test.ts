/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import * as crypto from 'crypto';
import { describe, it } from 'mocha';

import {
    DockerClient,
} from '../clients/DockerClient/DockerClient';
import { ShellStreamCommandRunnerFactory } from '../commandRunners/shellStream';
import { AccumulatorStream } from '../utils/AccumulatorStream';
import { escaped, quoted } from '../utils/commandLineBuilder';

xdescribe('DockerClient', () => {
    const client = new DockerClient();

    describe('#buildImageAsync()', () => {
        it('handles default values', async () => {
            const path = crypto.randomBytes(60).toString('utf8');

            const commandResult = await client.buildImage({
                path,
            });

            expect(commandResult).to.have.a.property('command', 'docker');
            expect(commandResult).to.have.a.property('args').that.deep.equals([escaped('image'), escaped('build'), quoted(path)]);
        });
        it('handles pull=true', async () => {
            const commandResult = await client.buildImage({
                path: '.',
                pull: true,
            });

            expect(commandResult).to.have.property('args').with.lengthOf(4);
        });
        it('handles pull=false', async () => {
            const commandResult = await client.buildImage({
                path: '.',
                pull: false,
            });

            expect(commandResult).to.have.property('args').with.lengthOf(3);
        });
        it('handles file', async () => {
            const file = crypto.randomBytes(60).toString('utf8');

            const commandResult = await client.buildImage({
                path: '.',
                file,
            });

            expect(commandResult).to.have.property('args').that.deep.equals([
                escaped('image'),
                escaped('build'),
                escaped('--file'),
                quoted(file),
                quoted('.')]);
        });
    });
});

xdescribe('Context tests', () => {
    const client = new DockerClient();
    const runnerFactory = new ShellStreamCommandRunnerFactory({
        onCommand: (command: string) => { console.log(`Executing ${command}`); },
    });
    const runner = runnerFactory.getCommandRunner();

    it('Should list some contexts', async () => {
        const results = await runner(
            client.listContexts({})
        );

        expect(results).to.be.ok;
    });

    it('Should use some contexts', async () => {
        await runner(
            client.useContext({ context: 'default' })
        );
    });

    it('Should inspect some contexts', async () => {
        const results = await runner(
            client.inspectContexts({ contexts: ['default', 'bwateraci'] })
        );

        expect(results).to.be.ok;
    });

    it('Should remove some contexts', async () => {
        const results = await runner(
            client.removeContexts({ contexts: ['bwateraci'] })
        );

        expect(results).to.be.ok;
    });
});

xdescribe('Files tests', () => {
    const client = new DockerClient();
    const runnerFactory = new ShellStreamCommandRunnerFactory({
        onCommand: (command: string) => { console.log(`Executing ${command}`); },
    });
    const runner = runnerFactory.getCommandRunner();

    it('Should list some files at the root', async () => {
        const acc = new AccumulatorStream();
        const sscr = new ShellStreamCommandRunnerFactory({
            onCommand: (command: string) => { console.log(`Executing ${command}`); },
            stdErrPipe: acc,
        });

        try {
            const results = await sscr.getCommandRunner()(
                client.listFiles({ container: '007', path: 'C:\\', operatingSystem: 'windows' })
                //client.listFiles({ container: 'e4b4', path: '/' })
            );

            expect(results).to.be.ok;
        } catch {
            console.error(await acc.getString());
        }
    });

    it('Should list some files in subfolders', async () => {
        const results = await runner(
            client.listFiles({ container: '007', path: 'C:\\Users\\ContainerUser\\Space Folder', operatingSystem: 'windows' })
            //client.listFiles({ container: 'e4b4', path: '/etc' })
        );

        expect(results).to.be.ok;
    });

    it('Should successfully read files', async () => {
        const accumulator = new AccumulatorStream();
        const errAccumulator = new AccumulatorStream();
        const sscr = new ShellStreamCommandRunnerFactory({
            onCommand: (command: string) => { console.log(`Executing ${command}`); },
            //stdOutPipe: tarXPipe(accumulator),
            stdOutPipe: accumulator,
            stdErrPipe: errAccumulator,
        });

        try {
            await sscr.getCommandRunner()(
                client.readFile({ container: '007', path: 'C:\\Users\\ContainerUser\\Space Folder\\foo 2.txt', operatingSystem: 'windows' })
            );

            const result = await accumulator.getString();

            expect(result).to.be.ok;
        } catch {
            const error = await errAccumulator.getString();
            console.error(error);
        }
    });

    xit('Should successfully write files', async () => {
        const errAccumulator = new AccumulatorStream();

        //const tarPipe = tar.create({ portable: true }, ["C:\\Users\\bwater\\source\\foo.txt"]);
        // const tarPipe = tarPPipe(stream.Readable.from('Goodbye w4rld!'));
        const sscr = new ShellStreamCommandRunnerFactory({
            onCommand: (command: string) => { console.log(`Executing ${command}`); },
            // stdInPipe: tarPipe,
            stdErrPipe: errAccumulator,
        });

        try {
            await sscr.getCommandRunner()(
                client.writeFile({ container: '2050439cba16', path: 'C:\\Users', operatingSystem: 'windows' })
            );
        } catch {
            const error = await errAccumulator.getString();
            console.error(error);
        }

        expect(1).to.be.ok;
    });

    xit('Should successfully copy files in', async () => {
        // TODO
    });

    xit('Should successfully copy files out', async () => {
        // TODO
    });
});

xdescribe('List', () => {
    it('Should info', async () => {
        const client = new DockerClient();
        const rf = new ShellStreamCommandRunnerFactory({ strict: true });

        const info = await rf.getCommandRunner()(
            client.info({})
        );

        console.log(info);
    });

    xit('Should list Images dangit', async () => {
        const client = new DockerClient();
        const rf = new ShellStreamCommandRunnerFactory({ strict: true });

        const results = await rf.getCommandRunner()(
            client.listImages({})
        );

        console.log(results);
    });

    xit('Should list containers dangit', async () => {
        const client = new DockerClient();
        const rf = new ShellStreamCommandRunnerFactory({ strict: true });

        const results = await rf.getCommandRunner()(
            client.listContainers({})
        );

        console.log(results);
    });

    xit('Should inspect', async () => {
        const client = new DockerClient();
        const rf = new ShellStreamCommandRunnerFactory({ strict: true });

        const results = await rf.getCommandRunner()(
            client.inspectContainers({ containers: ['9be396322ef0911b932ddcec231e8adeb63a5371f3a5ad182b1fe5ee0dc986f6'] })
        );

        console.log(results);
    });
});

describe('Bug', () => {
    it('Shouldn\'t be bugged', async () => {
        const imageName = 'dockerdebugrepro:latest';
        const client = new DockerClient();
        const crf = new ShellStreamCommandRunnerFactory({ strict: true });

        const result = await crf.getCommandRunner()(client.inspectImages({ images: [imageName] }));

        console.log(result);
    });
});
/*
function tarXPipe(destination: stream.Writable): tar.ParseStream {
    let entryCounter = 0;
    const tarParse = new tar.Parse(
        {
            filter: () => {
                return entryCounter < 1;
            },
            onentry: (entry: tar.ReadEntry) => {
                entryCounter++;
                (entry as unknown as NodeJS.ReadWriteStream).pipe(destination);
            },
        }
    );

    return tarParse;
}

function tarPPipe(source: stream.Readable): tar.PackStream {
    // @ts-expect-error It's wrong
    const tarPack = new tar.Pack({ portable: true });

    // @ts-expect-error It's wrong
    const readEntry: ReadEntry = new tar.ReadEntry({
        path: 'hello.txt',
        type: 'File',
        size: 14,
    });

    //await pipeline(source, readEntry as unknown as stream.Writable);

    source.pipe(readEntry as unknown as NodeJS.ReadWriteStream);
    tarPack.add(readEntry);
    tarPack.end();

    return tarPack;
}
*/
