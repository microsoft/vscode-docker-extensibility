/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContextValueRegistryItem, RegistryItem, isContextValueRegistryItem } from "../contracts/RegistryItem";

export function getContextValue(element: RegistryItem, ...additional: string[]): string {
    const providedContextValues = isContextValueRegistryItem(element) ? element.additionalContextValues ?? [] : [];

    const allContextValues = [...additional, ...providedContextValues].sort();
    const contextValueSet = new Set(allContextValues);
    return Array.from(contextValueSet).join(';');
}

export function addContextValues(...additionalContextValues: string[]) {
    return async function (target: unknown, name: string, descriptor: PropertyDescriptor) {
        const innerFunction: (...args: never) => Promise<ContextValueRegistryItem[]> = descriptor.value;

        descriptor.value = async function (...args: never) {
            const innerResults = await innerFunction(args);
            innerResults.forEach(innerResult => {
                innerResult.additionalContextValues ||= [];
                innerResult.additionalContextValues.push(...additionalContextValues);
            });

            return innerResults;
        };
    };
}
