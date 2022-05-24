/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { PodmanClient, getDockerExtensionExport } from '@microsoft/vscode-container-runtimes';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    try {
        const dockerExtension = await getDockerExtensionExport();
        context.subscriptions.push(dockerExtension.registerContainerRuntimeClient(new PodmanClient()));
    } catch {
        console.log('Bummer');
    }
}

export function deactivate(): void {
    // No-op
}
