/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { describe, it } from 'mocha';
import { DockerInspectContainerRecordSchema, normalizeDockerInspectContainerRecord } from '../clients/DockerClientBase/DockerInspectContainerRecord';

describe('(unit) DockerInspectContainerRecord', () => {
    describe('DockerInspectContainerRecordSchema', () => {
        it('should handle containers with unmapped ports (null port values)', () => {
            // This simulates the JSON structure Docker returns for a container with exposed but unmapped ports
            const containerWithUnmappedPorts = {
                Id: 'test-container-id',
                Name: '/test-container',
                Image: 'nginx:latest',
                Platform: 'linux',
                Created: '2023-01-01T00:00:00.000Z',
                Mounts: [],
                State: {
                    Status: 'running',
                    StartedAt: '2023-01-01T00:00:01.000Z',
                    FinishedAt: '0001-01-01T00:00:00Z'
                },
                Config: {
                    Image: 'nginx:latest',
                    Status: 'running',
                    Entrypoint: null,
                    Cmd: null,
                    Env: null,
                    Labels: null,
                    WorkingDir: null
                },
                HostConfig: {
                    PublishAllPorts: false,
                    Isolation: 'default'
                },
                NetworkSettings: {
                    Networks: null,
                    IPAddress: '172.17.0.2',
                    // This is the key issue: ports with null values instead of arrays
                    Ports: {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        '80/tcp': null,  // This would cause the Zod validation to fail
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        '443/tcp': null
                    }
                }
            };

            // This should not throw a Zod validation error
            expect(() => {
                const validated = DockerInspectContainerRecordSchema.parse(containerWithUnmappedPorts);
                expect(validated).to.be.an('object');
            }).to.not.throw();
        });

        it('should handle containers with mapped ports (array port values)', () => {
            const containerWithMappedPorts = {
                Id: 'test-container-id',
                Name: '/test-container',
                Image: 'nginx:latest',
                Platform: 'linux',
                Created: '2023-01-01T00:00:00.000Z',
                Mounts: [],
                State: {
                    Status: 'running',
                    StartedAt: '2023-01-01T00:00:01.000Z',
                    FinishedAt: '0001-01-01T00:00:00Z'
                },
                Config: {
                    Image: 'nginx:latest',
                    Status: 'running',
                    Entrypoint: null,
                    Cmd: null,
                    Env: null,
                    Labels: null,
                    WorkingDir: null
                },
                HostConfig: {
                    PublishAllPorts: false,
                    Isolation: 'default'
                },
                NetworkSettings: {
                    Networks: null,
                    IPAddress: '172.17.0.2',
                    Ports: {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        '80/tcp': [{ HostIp: '0.0.0.0', HostPort: '8080' }],
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        '443/tcp': [{ HostIp: '0.0.0.0', HostPort: '8443' }]
                    }
                }
            };

            expect(() => {
                const validated = DockerInspectContainerRecordSchema.parse(containerWithMappedPorts);
                expect(validated).to.be.an('object');
            }).to.not.throw();
        });
    });

    describe('normalizeDockerInspectContainerRecord', () => {
        it('should normalize containers with unmapped ports correctly', () => {
            const containerWithUnmappedPorts = {
                Id: 'test-container-id',
                Name: '/test-container',
                Image: 'nginx:latest',
                Platform: 'linux',
                Created: '2023-01-01T00:00:00.000Z',
                Mounts: [],
                State: {
                    Status: 'running',
                    StartedAt: '2023-01-01T00:00:01.000Z',
                    FinishedAt: '0001-01-01T00:00:00Z'
                },
                Config: {
                    Image: 'nginx:latest',
                    Status: 'running',
                    Entrypoint: null,
                    Cmd: null,
                    Env: null,
                    Labels: null,
                    WorkingDir: null
                },
                HostConfig: {
                    PublishAllPorts: false,
                    Isolation: 'default'
                },
                NetworkSettings: {
                    Networks: null,
                    IPAddress: '172.17.0.2',
                    Ports: {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        '80/tcp': null,
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        '443/tcp': null
                    }
                }
            };

            const normalized = normalizeDockerInspectContainerRecord(containerWithUnmappedPorts, JSON.stringify(containerWithUnmappedPorts));

            expect(normalized).to.be.an('object');
            expect(normalized.ports).to.be.an('array');
            expect(normalized.ports).to.have.lengthOf(2);
            
            // Both ports should have undefined hostPort since they're not mapped
            const port80 = normalized.ports.find(p => p.containerPort === 80);
            expect(port80).to.exist;
            expect(port80?.hostPort).to.be.undefined;
            expect(port80?.protocol).to.equal('tcp');

            const port443 = normalized.ports.find(p => p.containerPort === 443);
            expect(port443).to.exist;
            expect(port443?.hostPort).to.be.undefined;
            expect(port443?.protocol).to.equal('tcp');
        });
    });
});