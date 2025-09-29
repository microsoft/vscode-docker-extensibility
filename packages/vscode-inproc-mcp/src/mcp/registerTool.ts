/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CopilotTool, ToolIOSchema } from '../contracts/CopilotTool';
import { McpTool } from './McpTool';

/**
 * Registers a tool with the MCP server
 * @param server The MCP server to register the tool with
 * @param tool The tool to register
 * @returns The registered tool
 */
export function registerTool<TInSchema extends ToolIOSchema, TOutSchema extends ToolIOSchema>(
    server: McpServer,
    tool: CopilotTool<TInSchema, TOutSchema>
): RegisteredTool {
    const mcpTool = new McpTool<TInSchema, TOutSchema>(
        tool.name,
        tool.execute.bind(tool),
        {
            title: tool.title,
            description: tool.description,
            inputSchema: tool.inputSchema,
            outputSchema: tool.outputSchema,
            annotations: tool.annotations,
        }
    );

    return server.registerTool(
        mcpTool.name,
        {
            ...mcpTool,
            // Regrettably, the MCP SDK calls for the *shape* of the schema, not the schema itself
            inputSchema: mcpTool.inputSchema instanceof z.ZodVoid ? undefined : mcpTool.inputSchema?.shape,
            outputSchema: mcpTool.outputSchema instanceof z.ZodVoid ? undefined : mcpTool.outputSchema?.shape,
        },
        mcpTool.executeMcp.bind(mcpTool)
    );
}
