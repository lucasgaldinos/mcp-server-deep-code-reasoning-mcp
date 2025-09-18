#!/usr/bin/env tsx

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function testSimpleTool() {
  console.log('🧪 Testing simple MCP tool...');
  
  const client = new Client(
    { name: 'test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/src/index.js'],
      env: { ...process.env, GEMINI_API_KEY: 'test-key-1234567890' }  // Mock key for testing
    });

    await client.connect(transport);
    console.log('✅ Connected to MCP server');

    // Test a simpler tool first - health_check
    console.log('🔧 Testing health_check tool...');
    const result = await client.callTool({
      name: 'health_check',
      arguments: {}
    });
    
    console.log('✅ health_check successful:', result);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testSimpleTool().catch(console.error);