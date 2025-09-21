#!/usr/bin/env tsx

/**
 * Test the escalate_analysis_minimal tool
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

console.log('🧪 Testing escalate_analysis_minimal Tool');
console.log('==========================================');

const client = new Client(
  {
    name: 'test-client',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const stdio = new StdioClientTransport();

await client.connect(stdio);

console.log('\n📤 Sending: initialize (id: 1)');
const result = await client.initialize();

// Test 1: escalate_analysis_minimal with empty object
console.log('\n🔬 Test: escalate_analysis_minimal with empty object');
console.log('📤 Sending: tools/call (id: 2)');
const test1 = await client.callTool(
  'escalate_analysis_minimal',
  {}
);

// Test 2: escalate_analysis_minimal with minimal code_scope
console.log('\n🔬 Test: escalate_analysis_minimal with minimal code_scope');
console.log('📤 Sending: tools/call (id: 3)');
const test2 = await client.callTool(
  'escalate_analysis_minimal',
  {
    attempted_approaches: '["file reading"]',
    partial_findings: '["found imports"]',
    stuck_description: '["complex logic"]',
    code_scope_files: '["src/index.ts"]'
  }
);

console.log('\n📊 Results Summary:');
console.log('==================');
console.log(`${test1.isError ? '❌' : '✅'} escalate_analysis_minimal (empty): ${test1.isError ? test1.content[0]?.text : 'SUCCESS!'}`);
console.log(`${test2.isError ? '❌' : '✅'} escalate_analysis_minimal (minimal): ${test2.isError ? test2.content[0]?.text : 'SUCCESS!'}`);

console.log('\n🔍 Full Response Details:');
console.log(`\n1. escalate_analysis_minimal (empty):`);
console.log(JSON.stringify(test1, null, 2));
console.log(`\n2. escalate_analysis_minimal (minimal):`);
console.log(JSON.stringify(test2, null, 2));

process.exit(0);