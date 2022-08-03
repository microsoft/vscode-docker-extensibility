/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { EmptyImageName, ImageNameParts, parseDockerImageRepository } from '../clients/DockerLikeClient/parseDockerImageRepository';

type ParseTest = { original: string, expected: ImageNameParts };

describe('parseDockerImageRepository', () => {
    it('Should parse a wide variety of image formats', () => {
        const tests: ParseTest[] = [
            {
                original: 'foo:8080/bar/baz:latest',
                expected: { registry: 'foo:8080', imageName: 'bar/baz', tagName: 'latest' }
            },
            {
                original: '127.0.0.1/foo/a:latest',
                expected: { registry: '127.0.0.1', imageName: 'foo/a', tagName: 'latest' }
            },
            {
                original: '127.0.0.1:1234/foo/bar:5',
                expected: { registry: '127.0.0.1:1234', imageName: 'foo/bar', tagName: '5' }
            },
            {
                original: 'alpine',
                expected: { registry: undefined, imageName: 'alpine', tagName: undefined }
            },
            {
                original: 'alpine:latest',
                expected: { registry: undefined, imageName: 'alpine', tagName: 'latest' }
            },
            {
                original: 'library/alpine',
                expected: { registry: undefined, imageName: 'library/alpine', tagName: undefined }
            },
            {
                original: 'library/alpine:latest',
                expected: { registry: undefined, imageName: 'library/alpine', tagName: 'latest' }
            },
            {
                original: '[ab::0]:1234/foo',
                expected: { registry: '[ab::0]:1234', imageName: 'foo', tagName: undefined }
            },
            {
                original: 'mcr.microsoft.com/dotnet/aspnet:5.0',
                expected: { registry: 'mcr.microsoft.com', imageName: 'dotnet/aspnet', tagName: '5.0' }
            },
            {
                original: '<none>',
                expected: EmptyImageName
            },
            {
                original: '<none>:<none>',
                expected: EmptyImageName
            },
            {
                original: '<none>:1',
                expected: { registry: undefined, imageName: undefined, tagName: '1' }
            },
        ];

        for (const test of tests) {
            expect(parseDockerImageRepository(test.original)).to.deep.equal(test.expected);
        }
    });

    it('Should throw on invalid formats', () => {
        const invalidImageNames: string[] = [
            '_bad',
            'bad_',
            'bad_url:1234/bad',
            '<none',
            'BaD',
            'bad:BaD',
            'bad:_bad',
            'bad:bad_',
        ];

        for (const invalidImageName of invalidImageNames) {
            expect(() => parseDockerImageRepository(invalidImageName)).to.throw();
        }
    });
});
