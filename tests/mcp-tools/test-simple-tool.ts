#!/usr/bin/env tsx

/**
 * Test the new simple tool to isolate parameter validation issues
 */

import { spawn } from 'child_process';

async function testSimpleTool() {
  console.log('🧪 Testing Simple Tool Parameter Validation');
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
      capabilities: {},
      clientInfo: { name: 'simple-test', version: '1.0.0' }
    }
  });

  // Test the simple tool with empty object
  console.log('\n🔬 Test: test_simple_tool with empty object');
  const response1 = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'test_simple_tool',
      arguments: {}
    }
  });

  // Test the simple tool with parameters
  console.log('\n🔬 Test: test_simple_tool with parameters');
  const response2 = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'test_simple_tool',
      arguments: {
        attempted_approaches: ['test1', 'test2'],
        partial_findings: [{ finding: 'test' }]
      }
    }
  });

  // Test debug_parameters for comparison
  console.log('\n🔬 Test: debug_parameters (baseline)');
  const response3 = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'debug_parameters',
      arguments: {}
    }
  });

  serverProcess.kill();

  console.log('\n📊 Results Summary:');
  console.log('==================');
  
  const testResults = [
    { name: 'test_simple_tool (empty)', response: response1 },
    { name: 'test_simple_tool (with params)', response: response2 },
    { name: 'debug_parameters (baseline)', response: response3 }
  ];

  testResults.forEach(({ name, response }) => {
    if (response?.error) {
      console.log(`❌ ${name}: ${response.error.message}`);
    } else if (response?.result) {
      console.log(`✅ ${name}: SUCCESS`);
    } else {
      console.log(`⚠️  ${name}: No response received`);
    }
  });

  console.log('\n🔍 Full Response Details:');
  testResults.forEach(({ name, response }, index) => {
    console.log(`\n${index + 1}. ${name}:`);
    console.log(JSON.stringify(response, null, 2));
  });
}

testSimpleTool().catch(console.error);