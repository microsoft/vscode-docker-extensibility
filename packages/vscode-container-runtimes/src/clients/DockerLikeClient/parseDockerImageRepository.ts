/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Parse the full image name and return a tuple of the parts
 * @param repository The full name of the image (registry/name:tag)
 * @returns A tuple of [registry, name, tag]
 */
export function parseDockerImageRepository(repository: string): [string | undefined, string, string | undefined] {
    let index = repository.indexOf('/');

    const registry = index > -1 ? repository.substring(0, index) : undefined;
    const nameAndTag = index > -1 ? repository.substring(index + 1) : repository;

    index = nameAndTag.lastIndexOf(':');

    const name = index > -1 ? nameAndTag.substring(0, index) : nameAndTag;
    const tag = index > -1 ? nameAndTag.substring(index + 1) : undefined;

    return [registry, name, tag];
}
