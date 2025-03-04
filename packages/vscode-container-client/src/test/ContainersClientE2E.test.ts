/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';

describe('(integration) ContainersClientE2E', function () {
    this.timeout(10000); // Set a longer timeout for integration tests

    it('Should not run at all', function () {
        expect(1).to.equal(2, 'Should not run this test');
    });
});
