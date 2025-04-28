import * as vscode from 'vscode';
import { commonLogger } from './common/logger';
import { ExtensionContext } from './common/commands';
import { McpServer, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js"; // Import ToolCallback
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"; 
import { ZodRawShape, z } from 'zod';
import express, { Express, Request, Response } from 'express';
import { McpServerOptions, McpServerInstance, McpToolDefinition } from './types'; 
import { setupMetrics } from './metrics';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import http from 'http';

const SSE_ENDPOINT = '/sse';
const MESSAGES_ENDPOINT = '/messages';
const METRICS_ENDPOINT = '/metrics';

export function createMcpServer(options: McpServerOptions, extensionContext: ExtensionContext): McpServerInstance {
  const app = express();
  const server = new McpServer({
    name: options.name,
    version: options.version,
  });

  const transports: { [sessionId: string]: SSEServerTransport } = {};
  const metricsRegistry = setupMetrics();

  // --- Setup Routes (GET /sse, POST /messages, GET /metrics) --- 
  app.get(SSE_ENDPOINT, async (_: Request, res: Response) => {
    try {
      const transport = new SSEServerTransport(MESSAGES_ENDPOINT, res);
      transports[transport.sessionId] = transport;
      commonLogger.log(`New SSE connection for sessionId ${transport.sessionId}`);
      res.on('close', () => {
        commonLogger.log(`SSE connection closed for sessionId ${transport.sessionId}`);
        delete transports[transport.sessionId];
      });
      await server.connect(transport);
    } catch (err) {
      commonLogger.error('Error handling SSE connection', { err });
      if (!res.headersSent) res.status(500).send('SSE Connection Error');
    }
  });

  app.post(MESSAGES_ENDPOINT, express.json(), async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports[sessionId];
    if (transport) {
      commonLogger.log(`Handling post message for sessionId ${sessionId}`);
      try {
        await transport.handlePostMessage(req, res, req.body);
      } catch (err) {
        commonLogger.error(`Error handling post message for ${sessionId}`, { err });
        if (!res.headersSent) res.status(500).send('Error handling message');
      }
    } else {
      commonLogger.warn(`No transport found for sessionId ${sessionId}`);
      res.status(400).send('No transport found for sessionId');
    }
  });

  app.get(METRICS_ENDPOINT, async (_: Request, res: Response) => {
    try {
      res.set('Content-Type', metricsRegistry.contentType);
      const metrics = await metricsRegistry.metrics();
      res.end(metrics);
    } catch (err) {
      commonLogger.error('Error serving metrics', { err });
      res.status(500).send('Error serving metrics');
    }
  });

  // --- Register Tools Directly using server.tool --- 
  commonLogger.log("Registering MCP tools directly...");
  const noArgsSchema = z.object({});

  // --- End Tool Registration ---

  // Create a placeholder registerTool function for the return type
  // In this simplified setup, tools are registered directly above
  const registerTool = <T extends ZodRawShape>(tool: McpToolDefinition<T>): void => {
    commonLogger.log(`Registering tool ${tool.name}`);
    // The implementation passed in tool.implementation already has metrics/context handled
    // if created using createToolFunction
    server.tool(tool.name, tool.description, tool.schema, tool.implementation);
  };

  return {
    app,
    server,
    registerTool,
    start: async () => {
      const port = options.port || 8000;
      return new Promise<Express>((resolve, reject) => {
        // Wrap app with http.Server to allow closing
        const httpServer = http.createServer(app); 
        httpServer.on('error', (err) => { // Add error handler for listen
            commonLogger.error('HTTP server listen error', { err });
            reject(err);
        });
        httpServer.listen(port, () => {
          commonLogger.log(`MCP server listening on port ${port}`);
          // Store reference to httpServer? Or return it?
          // For now, just resolve the app as per original code.
          resolve(app);
        });
      });
    },
  };
}