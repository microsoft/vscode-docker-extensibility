/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { IContainersClient } from '../contracts/ContainerClient';
import { DockerClient } from '../clients/DockerClient/DockerClient';
import { PodmanClient } from '../clients/PodmanClient/PodmanClient';

// Modify the below options to configure the tests
const clientTypeToTest: ClientType = 'podman';

// Supply to run the login/logout tests
const dockerLogin = 'bwateratmsft';
const dockerPAT = '';

// No need to modify below this
let client: IContainersClient;

type ClientType = 'docker' | 'podman';

switch (clientTypeToTest) {
    case 'docker':
        client = new DockerClient();
        break;
    case 'podman':
        client = new PodmanClient();
        break;
    default:
        throw new Error(`Unsupported client type: ${clientTypeToTest}`);
}

describe('(integration) ContainersClientE2E', function () {
    this.timeout(10000); // Set a longer timeout for integration tests

    it('Should not run at all', function () {
        expect(1).to.equal(2, 'Should not run this test');
    });
});
