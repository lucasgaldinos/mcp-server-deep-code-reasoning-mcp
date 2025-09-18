#!/usr/bin/env tsx

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function testFlattenedSchema() {
  console.log('🧪 Testing flattened schema workaround...');
  
  const client = new Client(
    { name: 'test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/src/index.js'],
      env: { ...process.env, GEMINI_API_KEY: 'test-key-1234567890' }
    });

    await client.connect(transport);
    console.log('✅ Connected to MCP server');

    // List tools to see the new schema
    const toolsResponse = await client.listTools();
    const startConversationTool = toolsResponse.tools.find(t => t.name === 'start_conversation');
    if (startConversationTool) {
      console.log('🎯 New start_conversation tool schema:');
      console.log(JSON.stringify(startConversationTool.inputSchema, null, 2));
    }

    // Test the tool with flattened parameters (JSON strings)
    const testParams = {
      analysisType: 'hypothesis_test',
      attempted_approaches: JSON.stringify(['testing']),
      code_scope_files: JSON.stringify(['test.ts']),
      partial_findings: JSON.stringify([{ test: 'data' }]),
      stuck_description: JSON.stringify(['testing mcp server directly'])
    };

    console.log('\n🔧 Testing start_conversation with flattened params...');
    console.log('📤 Sending parameters:', JSON.stringify(testParams, null, 2));
    const result = await client.callTool({
      name: 'start_conversation',
      arguments: testParams
    });
    
    console.log('✅ Tool call successful!');
    console.log('📥 Result preview:', JSON.stringify(result, null, 2).substring(0, 500) + '...');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testFlattenedSchema().catch(console.error);