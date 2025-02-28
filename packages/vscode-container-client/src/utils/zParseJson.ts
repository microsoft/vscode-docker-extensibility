/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from 'zod';

/**
 * Parses JSON and validates it against a Zod schema in a single operation
 *
 * @param jsonString The JSON string to parse
 * @param schema The Zod schema to validate against
 * @returns The parsed and validated object
 */
export function zParseJson<T extends z.ZodTypeAny>(jsonString: string, schema: T): z.infer<T> {
    const parsed = JSON.parse(jsonString);
    return schema.parse(parsed);
}
