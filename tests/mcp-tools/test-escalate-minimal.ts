#!/usr/bin/env tsx

/**
 * Test the escalate_analysis_minimal tool
 */

import { spawn } from 'child_process';

async function testMinimalTool() {
  console.log('🧪 Testing escalate_analysis_minimal Tool');
  console.log('==========================================\n');

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
    console.log(`📤 Sending: ${message.method} (id: ${message.id})`);
    serverProcess.stdin.write(JSON.stringify(message) + '\n');
    
    const initialCount = responses.length;
    let attempts = 0;
    while (responses.length <= initialCount && attempts < 20) {
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

  // Test list tools to verify escalate_analysis_minimal exists
  console.log('\n🔬 List tools to verify escalate_analysis_minimal exists');
  const listResponse = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {}
  });
  
  console.log('\n📋 Available tools:');
  if (listResponse?.result?.tools) {
    listResponse.result.tools.forEach((tool: any) => {
      console.log(`  - ${tool.name}`);
    });
  }

  console.log('\n🔬 Test: escalate_analysis_minimal with empty object');
  console.log('📤 Sending: tools/call (id: 2)');
  const response1 = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'escalate_analysis_minimal',
      arguments: {}
    }
  });

  console.log('\n🔬 Test: escalate_analysis_minimal with minimal code_scope');
  console.log('📤 Sending: tools/call (id: 3)');
  const response2 = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'escalate_analysis_minimal',
      arguments: {
        attempted_approaches: '["file reading"]',
        partial_findings: '["found imports"]',
        stuck_description: '["complex logic"]',
        code_scope_files: '["src/index.ts"]'
      }
    }
  });

  // Clean up
  serverProcess.kill();

  // Results
  const tests = [
    { name: 'escalate_analysis_minimal (empty)', response: response1 },
    { name: 'escalate_analysis_minimal (minimal)', response: response2 }
  ];

  console.log('\n📊 Results Summary:');
  console.log('==================');
  
  for (const test of tests) {
    const status = test.response?.error ? '❌' : '✅';
    const message = test.response?.error?.message || 'SUCCESS!';
    console.log(`${status} ${test.name}: ${message}`);
  }

  console.log('\n🔍 Full Response Details:');
  tests.forEach((test, index) => {
    console.log(`\n${index + 1}. ${test.name}:`);
    console.log(JSON.stringify(test.response, null, 2));
  });
}

testMinimalTool().catch(console.error);