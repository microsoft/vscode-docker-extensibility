/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import * as os from 'os';
import { getSafeExecPath } from '../utils/getSafeExecPath';

describe('(unit) getSafeExecPath tests', () => {
    it('Should return the command as is on non-Windows platforms', function () {
        if (os.platform() === 'win32') {
            this.skip(); // Skip this test on Windows
        }

        expect(getSafeExecPath('some-command')).to.equal('some-command');
        expect(getSafeExecPath('/root/command')).to.equal('/root/command');
        expect(getSafeExecPath('./relative-command')).to.equal('./relative-command');
        expect(getSafeExecPath('../relative-command')).to.equal('../relative-command');
        expect(getSafeExecPath('relative/command')).to.equal('relative/command');
    });

    it('Should return an absolute path on Windows', function () {
        if (os.platform() !== 'win32') {
            this.skip(); // Skip this test on non-Windows
        }

        expect(getSafeExecPath('notepad').toLowerCase()).to.include('\\notepad.exe').and.to.include('c:\\'); // Ensure it resolves to a path that includes 'notepad.exe' and is on C drive
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(getSafeExecPath(process.env.COMSPEC!)).to.equal(process.env.COMSPEC);
    });

    it('Should not alter explicitly relative-pathed commands on Windows', function () {
        if (os.platform() !== 'win32') {
            this.skip(); // Skip this test on non-Windows
        }

        expect(getSafeExecPath('./relative-command')).to.equal('./relative-command');
        expect(getSafeExecPath('../relative-command')).to.equal('../relative-command');
        expect(getSafeExecPath('relative/command')).to.equal('relative/command');
    });
});
