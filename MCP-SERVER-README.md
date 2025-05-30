# SweetPad MCP Server

The SweetPad MCP (Model Context Protocol) Server enables AI assistants to interact with iOS/Swift development tools through VS Code.

## 🚀 Features

- **Execute VS Code Commands**: Run any SweetPad command via MCP
- **Task Completion Tracking**: Automatic detection when commands finish
- **Window Execution Logging**: Visual feedback with emoji indicators (🍭 Started, ✅ Completed, ❌ Failed)
- **Prometheus Metrics**: Monitor server performance and usage
- **Real-time Communication**: Server-Sent Events (SSE) for live updates

## 🔧 Setup

### In VS Code Extension

The MCP server starts automatically when the SweetPad extension activates:

- **Port**: 61337
- **SSE Endpoint**: `http://localhost:61337/sse`
- **Messages Endpoint**: `http://localhost:61337/messages`
- **Metrics Endpoint**: `http://localhost:61337/metrics`

### Standalone Server (Testing)

```bash
# Build the extension first
npm run build

# Run standalone server
node standalone-mcp-server.js
```

## 🛠️ Available Tools

### execute_vscode_command

Executes any VS Code command and waits for completion.

**Parameters:**
- `commandId` (string): The VS Code command ID to execute

**Example Commands:**
- `sweetpad.build.build` - Build the project
- `sweetpad.build.launch` - Build and launch app
- `sweetpad.build.clean` - Clean build artifacts
- `sweetpad.build.test` - Run tests
- `sweetpad.build.refreshView` - Refresh build view
- `sweetpad.simulators.start` - Start a simulator
- `sweetpad.destinations.select` - Select build destination

## 📊 Usage Example

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sweetpad": {
      "command": "node",
      "args": ["/path/to/sweetpad/standalone-mcp-server.js"],
      "env": {}
    }
  }
}
```

### Direct API Usage

```javascript
// Connect via SSE
const eventSource = new EventSource('http://localhost:61337/sse');

// Send command via POST
fetch('http://localhost:61337/messages?sessionId=YOUR_SESSION_ID', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'execute_vscode_command',
      arguments: {
        commandId: 'sweetpad.build.build'
      }
    }
  })
});
```

## 🧪 Testing

```bash
# Test the MCP server functionality
node test-mcp-client.js
```

The test client will:
1. Connect to the MCP server
2. Test the metrics endpoint
3. Execute a sample command
4. Display results

## 📝 Logs

### Extension Logs
Check VS Code's Output panel → SweetPad for detailed logs including:
- 🍭 Task start notifications
- ✅ Task completion signals  
- ❌ Error messages
- Progress updates

### Task Output
Commands write their output to: `<workspace>/.cursor/task_output.log`

## 🔍 Debugging

### Check Server Status
```bash
curl http://localhost:61337/metrics
```

### Monitor SSE Connection
```bash
curl -N -H "Accept: text/event-stream" http://localhost:61337/sse
```

### Common Issues

1. **Port 61337 in use**: Change the port in `src/extension.ts`
2. **Commands timeout**: Default timeout is 600 seconds (10 minutes)
3. **Missing dependencies**: Run `npm install` to ensure all packages are available

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │────│   SweetPad MCP   │────│   VS Code API   │
│   (Claude)      │    │     Server       │    │   Commands      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    SSE + HTTP              Express Server           Command Bus
                                 │
                        ┌────────┴────────┐
                        │   Xcode Tools   │
                        │ (xcodebuild,    │
                        │  simulators,    │
                        │  devices, etc.) │
                        └─────────────────┘
```

## 📦 Files

- `src/mcp_server.ts` - Main MCP server implementation
- `src/tools/executeCommand.ts` - Command execution tool
- `src/metrics.ts` - Prometheus metrics setup
- `src/types.ts` - TypeScript definitions
- `standalone-mcp-server.js` - Standalone server for testing
- `test-mcp-client.js` - Test client

## 🤝 Contributing

The MCP server implementation follows the Model Context Protocol specification. To add new tools:

1. Create tool definition in `src/tools/`
2. Register with `mcpInstance.registerTool()`
3. Add tests to verify functionality

## 📚 References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [SweetPad Extension Documentation](./README.md)
- [VS Code Command API](https://code.visualstudio.com/api/references/commands) 