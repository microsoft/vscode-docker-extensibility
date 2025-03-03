/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from 'zod';
declare module 'zod' {
    interface ZodArray<T extends z.ZodTypeAny> {
        /**
         * Parses a JSON string and validates it against this schema in a single operation
         *
         * @param jsonString The JSON string to parse
         * @returns The parsed and validated array
         */
        parseJson(jsonString: string): z.infer<z.ZodArray<T>>;
    }

    interface ZodObject<T extends z.ZodRawShape, UnknownKeys, Catchall> {
        /**
         * Parses a JSON string and validates it against this schema in a single operation
         *
         * @param jsonString The JSON string to parse
         * @returns The parsed and validated object
         */
        parseJson(jsonString: string): z.infer<z.ZodObject<T, UnknownKeys, Catchall>>;
    }
}

// Patch z.ZodObject to add a much-needed parseJson method
z.ZodObject.prototype.parseJson = function (jsonString: string) {
    const parsed = JSON.parse(jsonString);
    return this.parse(parsed);
};

// Patch z.ZodArray to add a much-needed parseJson method
z.ZodArray.prototype.parseJson = function (jsonString: string) {
    const parsed = JSON.parse(jsonString);
    return this.parse(parsed);
};

export { z };
