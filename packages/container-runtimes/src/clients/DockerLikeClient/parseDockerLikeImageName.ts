/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ImageNameInfo } from "../../contracts/ContainerClient";

/**
 * A regex for parsing image names. Because this is only used to parse CLI output, we can assume
 * the image names are valid.
 *
 * Registry: Everything before the first slash--must be either exactly "localhost", or contain a DNS
 * separator ".". Port, if present, will also be included. If it does not meet these rules, it is
 * not the registry but instead part of the image name. See
 * https://stackoverflow.com/questions/37861791/how-are-docker-image-names-parsed.
 *
 * Image name: Everything after the registry (if the registry is valid) until the tag. Otherwise,
 * everything until the tag.
 *
 * Tag: Everything after the ":", if it is present.
 */
const imageNameRegex = /^((?<registry>(localhost|([\w-]+(\.[\w-]+)+))(:\d+)?)\/)?(?<image>[\w./<>]+)(:(?<tag>[\w-.<>]+))?$/;

/**
 * Parse an image name and return its components.
 * @param originalName The original image name
 * @returns The separated registry, image, and tag, along with the input original name
 * and a verbose name composed of as much information as possible.
 */
export function parseDockerLikeImageName(originalName: string): ImageNameInfo {
    const match = imageNameRegex.exec(originalName);

    if (!match || !match.groups) {
        throw new Error('Invalid image name');
    }

    const { registry, image, tag } = match.groups;

    return {
        originalName,
        image,
        tag,
        registry,
        verboseName: `${registry || 'localhost'}/${image}${tag ? ':' + tag : ''}`,
        nonLocalhostVerboseName: `${registry && registry !== 'localhost' ? registry + '/' : ''}${image}${tag ? ':' + tag : ''}`,
    };
}
