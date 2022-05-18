/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { withNamedArg } from "../../utils/commandLineBuilder";

export const withDockerEnvArg = (env?: Record<string, string>) => withNamedArg('--env', Object.entries(env || {}).map(([key, value]) => `${key}=${value}`));
