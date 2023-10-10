/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { tryParseSize } from "./tryParseSize";

// default regex to parse the space reclaimed
const PruneSpaceReclaimedRegex = /Total space reclaimed: ([\w\s]+)/i;
const LineRegex = /^\w+$/igm;

export type PruneParseOptions = {
    // if space reclaimed regex is not provided, we'll use the default
    spaceReclaimedRegex?: RegExp;
    // if resource regex is not provided, we'll assume the resource is the line itself
    resourceRegex?: RegExp;
};

export type PruneResult = {
    spaceReclaimed: number;
    resources: string[];
};

export function parsePruneLikeOutput(output: string, options: PruneParseOptions): PruneResult {
    const resourceRegex = options?.resourceRegex || LineRegex;
    const spaceReclaimedRegex = options?.spaceReclaimedRegex || PruneSpaceReclaimedRegex;

    let deletedResources: string[] = [];
    let spaceReclaimed: number = 0;

    // match resources
    deletedResources = output.match(resourceRegex) || [];

    // remove the space reclaimed line if it exists
    if (deletedResources.length > 0) {
        deletedResources.pop();
    }

    // match space reclaimed
    const spaceMatched = spaceReclaimedRegex.exec(output)?.[0];
    spaceReclaimed = tryParseSize(spaceMatched) || 0;

    return {
        spaceReclaimed: spaceReclaimed,
        resources: deletedResources,
    };
}

