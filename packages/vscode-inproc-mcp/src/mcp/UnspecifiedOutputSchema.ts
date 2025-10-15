/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from 'zod';

/**
 * A schema that allows any {}-ish object, i.e. an object with any keys and values.
 * The passthrough() allows additional properties beyond those specified in the schema.
 * This is useful for tools that don't have a fixed output schema, or where it's not worth
 * specifying the full schema because the LLM can figure it out on its own.
 *
 * The `registerMcpTool` function will turn this into an `undefined` output schema in
 * the MCP tool registration.
 */
export const UnspecifiedOutputSchema = z.object({}).passthrough();
