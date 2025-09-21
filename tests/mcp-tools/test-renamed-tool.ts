#!/usr/bin/env tsx

/**
 * Test the escalate_analysis_minimal tool
 */

import { spawn } from 'child_process';

async function testRenamedTool() {
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
      capabilities: {},
      clientInfo: { name: 'renamed-test', version: '1.0.0' }
    }
  });

  // Test the renamed tool with empty object
  console.log('\n🔬 Test: escalate_analysis_test with empty object');
  const response1 = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'escalate_analysis_test',
      arguments: {}
    }
  });

  // Test the renamed tool with minimal parameters
  console.log('\n🔬 Test: escalate_analysis_test with minimal code_scope');
  const response2 = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'escalate_analysis_test',
      arguments: {
        code_scope: {
          files: ['test.ts']
        }
      }
    }
  });

  serverProcess.kill();

  console.log('\n📊 Results Summary:');
  console.log('==================');
  
  const testResults = [
    { name: 'escalate_analysis_test (empty)', response: response1 },
    { name: 'escalate_analysis_test (minimal)', response: response2 }
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

testRenamedTool().catch(console.error);