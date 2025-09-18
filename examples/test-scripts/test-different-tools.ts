#!/usr/bin/env tsx

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function testDifferentTools() {
  console.log('🧪 Testing different MCP tools...');
  
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

    // Test get_model_info (no parameters)
    console.log('\n🔧 Testing get_model_info (no params)...');
    try {
      const result1 = await client.callTool({
        name: 'get_model_info',
        arguments: {}
      });
      console.log('✅ get_model_info successful');
    } catch (error) {
      console.error('❌ get_model_info failed:', error instanceof Error ? error.message : String(error));
    }

    // Test set_model (simple string parameter)
    console.log('\n🔧 Testing set_model (simple param)...');
    try {
      const result2 = await client.callTool({
        name: 'set_model',
        arguments: { model: 'gemini-2.5-flash' }
      });
      console.log('✅ set_model successful');
    } catch (error) {
      console.error('❌ set_model failed:', error instanceof Error ? error.message : String(error));
    }

    // Test health_check with optional parameter
    console.log('\n🔧 Testing health_check (optional param)...');
    try {
      const result3 = await client.callTool({
        name: 'health_check',
        arguments: { check_name: 'memory-usage' }
      });
      console.log('✅ health_check with param successful');
    } catch (error) {
      console.error('❌ health_check with param failed:', error instanceof Error ? error.message : String(error));
    }

  } catch (error) {
    console.error('❌ Connection error:', error);
  } finally {
    await client.close();
  }
}

testDifferentTools().catch(console.error);