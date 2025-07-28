/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { describe, it } from 'mocha';
import { ShellQuotedString, ShellQuoting } from 'vscode';

import { Bash, Cmd, NoShell, Powershell, Shell } from '../utils/Shell';
import { spawn } from 'child_process';

describe('(integration) No Shell Quoting', () => {
    const tools: [string, string[]][] = [
        ['go', ['run', './tools/echoargs/echoargs.go']],
        ['node', ['./tools/echoargs/echoargs.js']],
    ];

    const shells: [string, Shell][] = [
        ['NoShell', new NoShell()],
    ];

    if (process.platform === 'win32') {
        shells.push(['Powershell', new Powershell()]);
        shells.push(['Cmd', new Cmd()]);
    } else {
        shells.push(['Bash', new Bash()]);
    }

    for (const [toolCmd, toolArgs] of tools) {
        for (const [shellName, shell] of shells) {
            it(`${shellName} should quote ${toolCmd} arguments correctly`, async function () {
                this.timeout(20000);

                const values: [ShellQuotedString | string, string | string[]][] = [
                    [{ value: 'nospace_escape', quoting: ShellQuoting.Escape }, 'nospace_escape'],
                    [{ value: 'nospace_weak', quoting: ShellQuoting.Weak }, 'nospace_weak'],
                    [{ value: 'nospace_strong', quoting: ShellQuoting.Strong }, 'nospace_strong'],
                    [{ value: 'with space', quoting: ShellQuoting.Escape }, 'with space'],
                    [{ value: 'with space', quoting: ShellQuoting.Weak }, 'with space'],
                    [{ value: 'with space', quoting: ShellQuoting.Strong }, 'with space'],
                    [{ value: '"with quotes"', quoting: ShellQuoting.Escape }, '"with quotes"'],
                    [{ value: '"with quotes"', quoting: ShellQuoting.Weak }, '"with quotes"'],
                    [{ value: '"with quotes"', quoting: ShellQuoting.Strong }, '"with quotes"'],
                    [{ value: "'with single quotes'", quoting: ShellQuoting.Escape }, "'with single quotes'"],
                    [{ value: "'with single quotes'", quoting: ShellQuoting.Weak }, "'with single quotes'"],
                    [{ value: "'with single quotes'", quoting: ShellQuoting.Strong }, "'with single quotes'"],
                    [{ value: 'with "quotes" and spaces', quoting: ShellQuoting.Escape }, 'with "quotes" and spaces'],
                    [{ value: 'with "quotes" and spaces', quoting: ShellQuoting.Weak }, 'with "quotes" and spaces'],
                    [{ value: 'with "quotes" and spaces', quoting: ShellQuoting.Strong }, 'with "quotes" and spaces'],
                    //['--label', '--label'],
                    //['key=value "with spaces and quotes"', ['key=value', 'with spaces and quotes']],
                ];

                let cmd = toolCmd;
                let args: string[] | undefined = toolArgs.concat(shell.quote(values.map(([arg]) => arg)));

                if (shell.getShellOrDefault()) {
                    cmd = `${cmd} ${args.join(' ')}`;
                    args = undefined;
                }

                console.log(`${cmd} ${args}`);

                const child = spawn(cmd, args, { shell: shell.getShellOrDefault(), windowsVerbatimArguments: true });

                const outargs: Array<string> = [];
                child.stdout.on('data', (data) => {
                    outargs.push(...data.toString().split('\n').filter((line: string) => line));
                });

                await new Promise<void>((resolve, reject) => {
                    child.on('exit', (code) => {
                        if (code !== 0) {
                            return reject(new Error(`Child process exited with code ${code}`));
                        }
                        resolve();
                    });
                    child.on('error', (err) => {
                        reject(err);
                    });
                });

                const expected = values.reduce((expected, [, e]) => expected.concat(e), [] as string[]);

                // Check that each argument is echoed back correctly
                expect(outargs).to.deep.equal(expected);
            });
        }
    }
});
