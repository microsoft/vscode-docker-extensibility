/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RunContainerMount } from "../../contracts/ContainerClient";
import { withNamedArg } from "../../utils/commandLineBuilder";

export const formatDockerMount = (mount: RunContainerMount): string => {
    const mountParts = new Array<string>(
        `type=${mount.type}`,
        `source=${mount.source}`,
        `destination=${mount.destination}`,
        mount.readOnly ? 'readonly' : '',
    );

    return mountParts.filter((part) => !!part).join(',');
};

export const withDockerMountsArg = (mounts?: Array<RunContainerMount>) => withNamedArg('--mount', (mounts || []).map(formatDockerMount));
