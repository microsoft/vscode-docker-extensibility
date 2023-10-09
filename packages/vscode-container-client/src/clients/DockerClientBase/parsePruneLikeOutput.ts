/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { asIds } from "../../utils/asIds";
import { tryParseSize } from "./tryParseSize";

export type PruneParseOptions = {
    spaceReclaimedRegex?: RegExp;
    resourceRegex?: RegExp;
};

export type PruneResult = {
    spaceReclaimed: number;
    resources: string[];
};

export function parsePruneLikeOutput(output: string, options: PruneParseOptions): PruneResult {
    const deletedResources: string[] = [];
    let spaceReclaimed: number = 0;

    const lines = asIds(output);

    if (lines.length === 0) {
        return {
            resources: [],
            spaceReclaimed: 0,
        };
    }

    // we want to ignore the last line when parsing for resources, which is the total reclaimed space
    for (const line of lines.slice(0, -1)) {
        // if we have a regex to parse the resource, use it
        if (options?.resourceRegex) {
            const deletedImageMatch = line.match(options.resourceRegex);
            if (deletedImageMatch && deletedImageMatch.length === 2) {
                deletedResources.push(deletedImageMatch[1]);
            }
        }
        // if not, we assume the resource is the line itself
        else {
            deletedResources.push(line);
        }

    }

    // last line is something like: "Total reclaimed space:"
    const lastLine = lines[lines.length - 1];
    const reclaimedSpaceMatch = options?.spaceReclaimedRegex ? lastLine.match(options.spaceReclaimedRegex) : null;
    // if we can't parse the reclaimed space somehow, we'll just return 0
    spaceReclaimed = reclaimedSpaceMatch?.[1] ? tryParseSize(reclaimedSpaceMatch[1]) || 0 : 0;

    return {
        spaceReclaimed: spaceReclaimed,
        resources: deletedResources,
    };
}

