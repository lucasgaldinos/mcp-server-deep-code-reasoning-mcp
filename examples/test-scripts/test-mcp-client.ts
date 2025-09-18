#!/usr/bin/env tsx

/**
 * Simple MCP client to test the deep-code-reasoning server directly
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testMCPServer() {
  console.log('🧪 Testing MCP Server directly...');
  
  // Create transport and client  
  const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/src/index.js'],
      env: { ...process.env, GEMINI_API_KEY: 'test-key-1234567890' }  // Mock key for testing
    });

  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    await client.connect(transport);
    console.log('✅ Connected to MCP server');

    // List tools
    const toolsResponse = await client.listTools();
    console.log('📋 Available tools:', toolsResponse.tools.map(t => t.name));
    
    // Find start_conversation tool
    const startConversationTool = toolsResponse.tools.find(t => t.name === 'start_conversation');
    if (startConversationTool) {
      console.log('🎯 start_conversation tool schema:');
      console.log(JSON.stringify(startConversationTool.inputSchema, null, 2));
    }

    // Test the tool with exact parameters
    const testParams = {
      analysisType: 'hypothesis_test',
      attempted_approaches: ['testing'],
      code_scope: {
        files: ['test.ts']
      },
      partial_findings: [{ test: 'data' }],
      stuck_description: ['testing mcp server directly']
    };

    console.log('🔧 Testing start_conversation tool...');
    console.log('📤 Sending parameters:', JSON.stringify(testParams, null, 2));
    const result = await client.callTool({
      name: 'start_conversation',
      arguments: testParams
    });
    
    console.log('✅ Tool call successful:', result);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testMCPServer().catch(console.error);