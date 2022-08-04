/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const NONE = '<none>';

/**
 * A regex for parsing image names. Because this is only used to parse CLI output, we can assume
 * the image names are valid.
 *
 * Registry: Everything before the first slash--must be either exactly "localhost", contain a DNS
 * separator ".", or a port separator ":". If it does not meet these rules, it is not the
 * registry but instead part of the image name. See
 * https://stackoverflow.com/questions/37861791/how-are-docker-image-names-parsed.
 *
 * Image name: Everything after the registry (if the registry is valid) until the tag. Otherwise,
 * everything until the tag.
 *
 * Tag: Everything after the ":", if it is present.
 */
const imageRegex = /^((?<registry>(localhost)|([\w-]+:\d+)|(([\w-]+\.)+[\w-]+(:\d+)?))\/)?(?<imageName>[\w-./<>]+)(:(?<tagName>[\w-.<>]+))?$/;

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
