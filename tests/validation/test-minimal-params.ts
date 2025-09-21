#!/usr/bin/env tsx

/**
 * Test to validate the escalate_analysis tool with minimal required parameters
 * This test determines the minimum viable parameter set for successful validation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { spawn } from 'child_process';

async function testMinimalParameters() {
  console.log('🧪 Testing Minimal Parameter Sets');
  console.log('==================================\n');

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

  // Helper function to send message and wait for response
  const sendMessage = async (message: any) => {
    message.id = messageId++;
    console.log(`📤 Sending: ${message.method} (id: ${message.id})`);
    serverProcess.stdin.write(JSON.stringify(message) + '\n');
    
    // Wait for response
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
      clientInfo: { name: 'minimal-test', version: '1.0.0' }
    }
  });

  // Test 1: escalate_analysis with just files
  console.log('\n🔬 Test 1: escalate_analysis with minimal code_scope');
  const response1 = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'escalate_analysis',
      arguments: {
        code_scope: {
          files: ['test.ts']
        }
      }
    }
  });

  // Test 2: escalate_analysis with empty arrays
  console.log('\n🔬 Test 2: escalate_analysis with empty arrays');
  const response2 = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'escalate_analysis',
      arguments: {
        attempted_approaches: [],
        partial_findings: [],
        stuck_description: [],
        code_scope: {
          files: ['test.ts']
        }
      }
    }
  });

  // Test 3: run_hypothesis_tournament with empty arrays
  console.log('\n🔬 Test 3: run_hypothesis_tournament with empty arrays');
  const response3 = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'run_hypothesis_tournament',
      arguments: {
        attempted_approaches: [],
        partial_findings: [],
        stuck_description: [],
        code_scope: {
          files: ['test.ts']
        }
      }
    }
  });

  // Test 4: debug_parameters (should work as baseline)
  console.log('\n🔬 Test 4: debug_parameters (baseline)');
  const response4 = await sendMessage({
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
    { name: 'escalate_analysis (minimal)', response: response1 },
    { name: 'escalate_analysis (empty arrays)', response: response2 },
    { name: 'run_hypothesis_tournament (empty arrays)', response: response3 },
    { name: 'debug_parameters (baseline)', response: response4 }
  ];

  testResults.forEach(({ name, response }, index) => {
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

testMinimalParameters().catch(console.error);