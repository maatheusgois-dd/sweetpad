#!/usr/bin/env node

const EventSource = require('eventsource');
const fetch = require('node-fetch');

class SimpleMcpClient {
  constructor(baseUrl = 'http://localhost:61337') {
    this.baseUrl = baseUrl;
    this.sessionId = null;
    this.eventSource = null;
  }

  async connect() {
    console.log('🔌 Connecting to MCP server...');
    
    try {
      // Initialize SSE connection
      this.eventSource = new EventSource(`${this.baseUrl}/sse`);
      
      this.eventSource.onopen = () => {
        console.log('✅ SSE connection established');
      };
      
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received:', data);
          
          if (data.method === 'notifications/initialized') {
            this.sessionId = data.sessionId;
            console.log(`🆔 Session ID: ${this.sessionId}`);
          }
        } catch (e) {
          console.log('📨 Raw message:', event.data);
        }
      };
      
      this.eventSource.onerror = (error) => {
        console.error('❌ SSE error:', error);
      };
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('❌ Connection failed:', error);
    }
  }

  async testExecuteCommand() {
    if (!this.sessionId) {
      console.error('❌ No session established');
      return;
    }

    console.log('🧪 Testing execute_vscode_command...');
    
    try {
      const response = await fetch(`${this.baseUrl}/messages?sessionId=${this.sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'execute_vscode_command',
            arguments: {
              commandId: 'sweetpad.build.refreshView'
            }
          }
        })
      });

      const result = await response.text();
      console.log('📥 Response:', result);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  async testMetrics() {
    console.log('📊 Testing metrics endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/metrics`);
      const metrics = await response.text();
      console.log('📊 Metrics response:', metrics.substring(0, 200) + '...');
      
    } catch (error) {
      console.error('❌ Metrics test failed:', error);
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      console.log('🔌 Disconnected');
    }
  }
}

async function runTests() {
  const client = new SimpleMcpClient();
  
  try {
    await client.connect();
    await client.testMetrics();
    await client.testExecuteCommand();
    
    console.log('✅ All tests completed');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    client.disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  runTests();
} 