/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { LabelFilters } from "../../contracts/ContainerClient";
import { withNamedArg } from "../../utils/commandLineBuilder";
import { conditional } from "../../utils/conditional";

export const formatDockerLabelFilter = (name: string, value: boolean | string): string | undefined => {
    if (typeof value === 'boolean' && value) {
        return `label=${name}`;
    } else if (typeof value === 'string') {
        return conditional`label=${name}=${value}`;
    }

    return undefined;
};

export const withDockerLabelFilterArgs = (labels?: LabelFilters) => withNamedArg('--filter', Object.entries(labels || {}).map(([label, value]) => formatDockerLabelFilter(label, value)));
