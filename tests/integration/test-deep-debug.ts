#!/usr/bin/env tsx

/**
 * Deep debug test for MCP parameter validation
 * This test examines the exact MCP JSON-RPC communication to identify validation issues
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

async function testMCPParameterValidation() {
  console.log('🔍 Deep Debug: MCP Parameter Validation');
  console.log('=========================================\n');

  // Test 1: Examine the actual JSON Schema declarations
  try {
    console.log('📋 Step 1: Reading compiled server to check JSON Schema...');
    const serverCode = await fs.readFile('./dist/src/index.js', 'utf-8');
    
    // Extract escalate_analysis schema
    const escalateMatch = serverCode.match(/name:\s*['"]escalate_analysis['"][\s\S]*?required:\s*\[(.*?)\]/);
    console.log('🔍 escalate_analysis required field:', escalateMatch ? escalateMatch[1] : 'NOT FOUND');
    
    // Extract run_hypothesis_tournament schema  
    const tournamentMatch = serverCode.match(/name:\s*['"]run_hypothesis_tournament['"][\s\S]*?required:\s*\[(.*?)\]/);
    console.log('🔍 run_hypothesis_tournament required field:', tournamentMatch ? tournamentMatch[1] : 'NOT FOUND');
    
  } catch (error) {
    console.error('❌ Error reading compiled server:', error);
  }

  // Test 2: Start MCP server and test JSON-RPC communication
  console.log('\n📡 Step 2: Testing direct JSON-RPC communication...');
  
  const serverProcess = spawn('node', ['./dist/src/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let serverOutput = '';
  let serverError = '';

  serverProcess.stdout.on('data', (data) => {
    serverOutput += data.toString();
  });

  serverProcess.stderr.on('data', (data) => {
    serverError += data.toString();
  });

  // Send initialization
  const initMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'debug-test',
        version: '1.0.0'
      }
    }
  };

  console.log('📤 Sending initialize request...');
  serverProcess.stdin.write(JSON.stringify(initMessage) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Send tools/list request
  const listMessage = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };

  console.log('📤 Sending tools/list request...');
  serverProcess.stdin.write(JSON.stringify(listMessage) + '\n');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test escalate_analysis with empty object
  const escalateMessage = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'escalate_analysis',
      arguments: {} // Empty object - should work with required: []
    }
  };

  console.log('📤 Testing escalate_analysis with empty object...');
  serverProcess.stdin.write(JSON.stringify(escalateMessage) + '\n');

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test run_hypothesis_tournament with empty object
  const tournamentMessage = {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'run_hypothesis_tournament',
      arguments: {} // Empty object - should work with required: []
    }
  };

  console.log('📤 Testing run_hypothesis_tournament with empty object...');
  serverProcess.stdin.write(JSON.stringify(tournamentMessage) + '\n');

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Terminate server
  serverProcess.kill();

  console.log('\n📥 Server Output:');
  console.log(serverOutput);
  
  if (serverError) {
    console.log('\n❌ Server Errors:');
    console.log(serverError);
  }

  // Analyze responses
  const responses = serverOutput.split('\n').filter(line => line.trim()).map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);

  console.log('\n🔬 Response Analysis:');
  responses.forEach((response, index) => {
    console.log(`Response ${index + 1}:`, JSON.stringify(response, null, 2));
  });
}

testMCPParameterValidation().catch(console.error);