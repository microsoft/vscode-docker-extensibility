/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Strip the first two arguments (node and script path) and print the rest
for (const arg of process.argv.slice(2)) {
    console.log(arg);
}
