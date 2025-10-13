/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as vscode from 'vscode';
import { startInProcHttpServer } from './inProcHttpServer';

/**
 * Options for registering an in-proc MCP HTTP provider
 */
export type McpProviderOptions = {
    /**
     * The ID for this MCP provider. Must match what is in package.json
     */
    id: string;

    /**
     * A human-readable label for the server
     */
    serverLabel: string;

    /**
     * The version of the MCP server. VSCode does use this as a hint on whether it should refresh the tool list
     */
    serverVersion?: string;

    /**
     * Function that returns a new MCP server instance. A new server must be created
     * for each MCP session, so this function should not return the same instance each time.
     */
    getNewMcpServer: () => McpServer | Promise<McpServer>;

    /**
     * Optional event that fires when the set of available MCP server definitions changes
     */
    onDidChange?: vscode.Event<void>;
};

/**
 * Registers an in-proc MCP HTTP server provider
 * @param context The extension context
 * @param options The options for the MCP provider
 */
export function registerMcpHttpProvider(context: vscode.ExtensionContext, options: McpProviderOptions): void {
    context.subscriptions.push(
        vscode.lm.registerMcpServerDefinitionProvider(options.id, {
            provideMcpServerDefinitions(token: vscode.CancellationToken): vscode.ProviderResult<vscode.McpServerDefinition[]> {
                return [
                    new vscode.McpHttpServerDefinition(
                        options.serverLabel,
                        vscode.Uri.from({ scheme: 'http', authority: 'invalid.invalid' }), // Dummy URL; the MCP server will be in-proc and must be resolved first
                        undefined,
                        options.serverVersion
                    ),
                ];
            },
            async resolveMcpServerDefinition(server: vscode.McpHttpServerDefinition, token: vscode.CancellationToken): Promise<vscode.McpServerDefinition> {
                const { disposable, serverUri, headers } = await startInProcHttpServer(options.getNewMcpServer);
                context.subscriptions.push(disposable);
                server.uri = serverUri;
                server.headers = headers;
                return server;
            },
            onDidChangeMcpServerDefinitions: options.onDidChange,
        })
    );
}
