import { ZodRawShape } from 'zod'
import { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import { withMetrics } from './metrics'
import { McpToolDefinition } from './types'

/**
 * Create a tool function with metrics instrumentation
 *
 * @param name - Name of the tool
 * @param description - Description of the tool
 * @param schema - Zod schema for tool parameters
 * @param implementation - Tool implementation function
 * @returns McpToolDefinition - Tool definition ready to be registered with the server
 */
export function createToolFunction<T extends ZodRawShape>(
  name: string,
  description: string,
  schema: T,
  implementation: ToolCallback<T>
): McpToolDefinition<T> {
  const wrappedImplementation = withMetrics<T>(name, implementation)

  return {
    name,
    description,
    schema,
    implementation: wrappedImplementation as ToolCallback<T>,
  }
} 