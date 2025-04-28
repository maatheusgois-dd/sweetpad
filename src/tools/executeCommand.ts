import * as vscode from 'vscode'; // Needed for executeCommand
import { z } from 'zod';
import { createToolFunction } from '../createToolFunction'; 
import { commonLogger } from '../common/logger'; 
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { ExtensionContext } from '../common/commands';

// Define schema using z.object()
const executeCommandSchema = z.object({
  commandId: z.string().describe('The VS Code command ID to execute (e.g., sweetpad.build.build)'),
  // commandArgs: z.array(z.any()).optional().describe('Optional arguments array for the command')
});

// Infer the type from the schema for the implementation arguments
type ExecuteCommandArgs = z.infer<typeof executeCommandSchema>;

// Create the tool function
const executeCommandTool = createToolFunction(
  'execute_vscode_command',
  'Executes a specified VS Code command by its ID.',
  executeCommandSchema.shape, // Pass the raw shape
  // Use the inferred type for args
  (args: ExecuteCommandArgs, extra: RequestHandlerExtra<any, any>) => {
    const { commandId } = args;
    commonLogger.log(`Executing VS Code command via MCP: ${commandId}`);
    try {

      void vscode.commands.executeCommand(commandId);

      commonLogger.log(`Command '${commandId}' executed successfully via MCP.`);
      return {
        content: [{ 
            type: 'text', // Specify the content type
            text: `Successfully executed command: ${commandId}.` 
        }],
      };
    } catch (error: any) {
       commonLogger.error(`Failed to execute command '${commandId}' via MCP`, { error });
       return {
         content: [{ type: 'text', text: `Error executing command '${commandId}': ${error.message}` }],
         isError: true,
       };
    }
  }
);

export default executeCommandTool; 