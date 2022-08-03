/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const NONE = '<none>';

const imageRegex = /^((?<registry>[a-z0-9-.:[\]]+)\/)??((?<imageName>((([a-z0-9]([a-z0-9-_.]*[a-z0-9])?)\/?){1,2})|(<none>)))(:(?<tagName>([a-z0-9]([a-z0-9-_.]*[a-z0-9])?)|(<none>)))?$/;

export type ImageNameParts = {
    registry: string | undefined;
    imageName: string | undefined;
    tagName: string | undefined;
};

export const EmptyImageName: ImageNameParts = {
    registry: undefined,
    imageName: undefined,
    tagName: undefined,
};

/**
 * Parse an image name and return a tuple of the parts
 * @param original The original image name
 * @returns The separated registry, image, and tag
 */
export function parseDockerImageRepository(original: string): ImageNameParts {
    const match = imageRegex.exec(original);

    if (!match?.groups) {
        throw new Error(`Invalid image name: ${original}`);
    }

    const registry = match.groups['registry'];

    let imageName: string | undefined = match.groups['imageName'];
    if (imageName === NONE) {
        imageName = undefined;
    }

    let tagName: string | undefined = match.groups['tagName'];
    if (tagName === NONE) {
        tagName = undefined;
    }

    return { registry, imageName, tagName };
}
