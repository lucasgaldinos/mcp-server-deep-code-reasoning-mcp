#!/usr/bin/env tsx

/**
 * Test all MCP tools to identify which ones need validation fixes
 */

import { spawn } from 'child_process';

async function testAllTools() {
  console.log('🧪 Testing ALL MCP Tools for Parameter Validation');
  console.log('=================================================\n');

  const serverProcess = spawn('node', ['./dist/src/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responses: any[] = [];
  let messageId = 1;

  serverProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter((line: string) => line.trim());
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.jsonrpc && (parsed.result || parsed.error)) {
          responses.push(parsed);
        }
      } catch {
        // Ignore non-JSON lines
      }
    }
  });

  const sendMessage = async (message: any) => {
    message.id = messageId++;
    serverProcess.stdin.write(JSON.stringify(message) + '\n');
    
    const initialCount = responses.length;
    let attempts = 0;
    while (responses.length <= initialCount && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    return responses[responses.length - 1];
  };

  // Initialize
  await sendMessage({
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }
  });

  // Get list of tools
  const listResponse = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {}
  });
  
  const tools = listResponse?.result?.tools || [];
  console.log(`📋 Found ${tools.length} tools to test:\n`);
  
  const results: any[] = [];

  // Test each tool with empty parameters
  for (const tool of tools) {
    console.log(`🔬 Testing: ${tool.name}`);
    
    const response = await sendMessage({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: tool.name,
        arguments: {}
      }
    });

    const status = response?.error ? '❌' : '✅';
    const message = response?.error?.message?.substring(0, 100) || 'SUCCESS!';
    
    results.push({
      name: tool.name,
      status,
      message,
      response
    });
    
    console.log(`  ${status} ${message}`);
  }

  // Clean up
  serverProcess.kill();

  // Summary
  console.log('\n📊 SUMMARY RESULTS:');
  console.log('==================');
  
  const working = results.filter(r => r.status === '✅');
  const failing = results.filter(r => r.status === '❌');
  
  console.log(`✅ Working tools (${working.length}):`);
  working.forEach(r => console.log(`  - ${r.name}`));
  
  console.log(`\n❌ Failing tools (${failing.length}):`);
  failing.forEach(r => console.log(`  - ${r.name}: ${r.message}`));

  // Show details for failing tools
  if (failing.length > 0) {
    console.log('\n🔍 FAILURE DETAILS:');
    console.log('==================');
    
    failing.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.name}:`);
      console.log(JSON.stringify(result.response, null, 2));
    });
  }

  console.log(`\n🎯 VALIDATION SUCCESS RATE: ${working.length}/${results.length} (${Math.round(working.length/results.length*100)}%)`);
}

testAllTools().catch(console.error);