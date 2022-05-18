/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export function parsePodmanImageRepository(repository: string): [string, string, string] {
    let index = repository.indexOf('/');
    if (index < 0) {
        throw new Error('Invalid image format: missing registry');
    }

    const registry = repository.substring(0, index);
    const nameAndTag = repository.substring(index + 1);

    index = nameAndTag.lastIndexOf(':');
    if (index < 0) {
        throw new Error('Invalid image format: missing tag');
    }

    const name = nameAndTag.substring(0, index);
    const tag = nameAndTag.substring(index + 1);

    return [registry, name, tag];
}
