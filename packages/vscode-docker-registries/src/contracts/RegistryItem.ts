/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RegistryItem = any | ContextValueRegistryItem;

export interface ContextValueRegistryItem {
    readonly additionalContextValues: string[];
}

export function isContextValueRegistryItem(maybeContextValueRegistryItem: unknown): maybeContextValueRegistryItem is ContextValueRegistryItem {
    return !!maybeContextValueRegistryItem && typeof maybeContextValueRegistryItem === 'object' && Array.isArray((maybeContextValueRegistryItem as ContextValueRegistryItem).additionalContextValues);
}
