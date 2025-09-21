#!/usr/bin/env tsx

/**
 * Test the working test_simple_tool vs escalate_analysis_minimal side by side
 */

import { spawn } from 'child_process';

async function testComparison() {
  console.log('🧪 Testing test_simple_tool vs escalate_analysis_minimal');
  console.log('======================================================\n');

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

  console.log('\n🔬 Test: test_simple_tool (WORKING TOOL) with empty object');
  const response1 = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'test_simple_tool',
      arguments: {}
    }
  });

  console.log('\n🔬 Test: test_simple_tool with parameters');
  const response2 = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'test_simple_tool',
      arguments: {
        attempted_approaches: ["file reading"],
        partial_findings: [{ type: "test" }]
      }
    }
  });

  console.log('\n🔬 Test: escalate_analysis_minimal (FAILING TOOL) with empty object');
  const response3 = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'escalate_analysis_minimal',
      arguments: {}
    }
  });

  console.log('\n🔬 Test: escalate_analysis_minimal with parameters');
  const response4 = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'escalate_analysis_minimal',
      arguments: {
        attempted_approaches: ["file reading"],
        partial_findings: [{ type: "test" }]
      }
    }
  });

  // Clean up
  serverProcess.kill();

  // Results
  const tests = [
    { name: 'test_simple_tool (empty)', response: response1 },
    { name: 'test_simple_tool (params)', response: response2 },
    { name: 'escalate_analysis_minimal (empty)', response: response3 },
    { name: 'escalate_analysis_minimal (params)', response: response4 }
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

testComparison().catch(console.error);