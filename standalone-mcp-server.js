#!/usr/bin/env node

const { createMcpServer } = require('./out/extension.js');

// Mock VS Code context for standalone testing
const mockContext = {
  simpleTaskCompletionEmitter: {
    event: (listener) => {
      // Return a disposable
      return { dispose: () => {} };
    },
    fire: () => {}
  },
  UI_LOG_PATH: () => './mcp-test.log',
  updateProgressStatus: (message) => {
    console.log(`Progress: ${message}`);
  }
};

async function startStandalone() {
  try {
    console.log('Starting standalone MCP server...');
    
    const mcpInstance = createMcpServer({
      name: "SweetpadCommandRunner-Standalone",
      version: "0.1.60",
      port: 61337
    }, mockContext);

    await mcpInstance.start();
    console.log('✅ Standalone MCP server started successfully on port 61337');
    console.log('🔗 Connect via: http://localhost:61337/sse');
    console.log('📊 Metrics available at: http://localhost:61337/metrics');
    
  } catch (error) {
    console.error('❌ Failed to start standalone MCP server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startStandalone();
} 