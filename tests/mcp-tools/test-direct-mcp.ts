#!/usr/bin/env tsx
/**
 * Direct MCP test using VS Code integration pattern
 * Tests tools by sending JSON-RPC requests directly
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  response?: any;
}

// Simplified tool tests focusing on the 9 failing tools from our research
const TOOLS_TO_TEST = [
  // Working tools (validate they still work)
  { name: 'debug_parameters', params: { testParam: 'test' } },
  { name: 'escalate_analysis', params: { attempted_approaches: ['test'] } },
  { name: 'health_check', params: {} },
  { name: 'get_model_info', params: {} },
  
  // Focus on the 9 failing tools
  { name: 'trace_execution_path', params: { entryPoint: { file: 'src/index.ts', line: 100 } } },
  { name: 'hypothesis_test', params: { hypothesis: 'test', codeScope: { files: ['test.ts'] }, testApproach: 'simple' } },
  { name: 'cross_system_impact', params: { changeScope: { files: ['test.ts'] } } },
  { name: 'performance_bottleneck', params: { codePath: { entryPoint: { file: 'test.ts', line: 1 } } } },
  { name: 'start_conversation', params: { 
    attempted_approaches: JSON.stringify(['test']),
    partial_findings: JSON.stringify([]),
    stuck_description: JSON.stringify(['testing']),
    code_scope_files: JSON.stringify(['test.ts']),
    analysisType: 'execution_trace'
  }},
  { name: 'continue_conversation', params: { sessionId: 'test', message: 'test' } },
  { name: 'finalize_conversation', params: { sessionId: 'test' } },
  { name: 'get_conversation_status', params: { sessionId: 'test' } },
  { name: 'run_hypothesis_tournament', params: {} }
];

async function testToolDirect(toolName: string, params: any): Promise<TestResult> {
  return new Promise((resolve) => {
    console.log(`🧪 Testing ${toolName}...`);
    
    const server = spawn('npx', ['tsx', 'src/index.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let output = '';
    let received = false;
    
    const timeout = setTimeout(() => {
      if (!received) {
        received = true;
        server.kill();
        resolve({ name: toolName, success: false, error: 'Timeout waiting for response' });
      }
    }, 8000);

    server.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Wait for server ready
      if (text.includes('Ready to handle requests') && !received) {
        // Send the tool call request
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: params
          }
        };
        
        server.stdin.write(JSON.stringify(request) + '\n');
      }
      
      // Look for JSON response
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.trim() && (line.includes('"content"') || line.includes('"error"') || line.includes('"result"'))) {
          try {
            const response = JSON.parse(line);
            if (!received) {
              received = true;
              clearTimeout(timeout);
              server.kill();
              
              const success = response.result && response.result.content && !response.error;
              resolve({
                name: toolName,
                success,
                response: response.result || response.error,
                error: response.error ? JSON.stringify(response.error) : undefined
              });
              return;
            }
          } catch (e) {
            // Not a JSON line, continue
          }
        }
      }
    });

    server.stderr.on('data', (data) => {
      console.log(`[${toolName} stderr]:`, data.toString().slice(0, 200));
    });

    server.on('close', (code) => {
      if (!received) {
        received = true;
        clearTimeout(timeout);
        resolve({ 
          name: toolName, 
          success: false, 
          error: `Server exited with code ${code}` 
        });
      }
    });
  });
}

async function runTests() {
  console.log('🚀 Testing MCP tools with direct JSON-RPC calls...\n');
  
  const results: TestResult[] = [];
  
  for (const tool of TOOLS_TO_TEST) {
    const result = await testToolDirect(tool.name, tool.params);
    results.push(result);
    
    // Show immediate result
    if (result.success) {
      console.log(`  ✅ ${result.name} - SUCCESS`);
    } else {
      console.log(`  ❌ ${result.name} - FAILED: ${result.error || 'Unknown error'}`);
    }
    
    // Brief pause between tests
    await setTimeout(500);
  }

  // Summary
  const working = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 RESULTS: ${working}/${total} tools working (${Math.round(working/total*100)}%)`);
  console.log('='.repeat(60));

  const workingTools = results.filter(r => r.success);
  const failingTools = results.filter(r => !r.success);

  if (workingTools.length > 0) {
    console.log('\n✅ WORKING TOOLS:');
    workingTools.forEach(t => console.log(`   ✅ ${t.name}`));
  }

  if (failingTools.length > 0) {
    console.log('\n❌ FAILING TOOLS:');
    failingTools.forEach(t => console.log(`   ❌ ${t.name}: ${t.error?.slice(0, 50)}...`));
  }

  // Show next steps
  if (failingTools.length > 0) {
    console.log('\n🔧 NEXT STEPS:');
    console.log('   1. Fix parameter validation in failing tools');
    console.log('   2. Remove Zod validation conflicts');
    console.log('   3. Test again until all tools work');
  }

  return results;
}

// Run the tests
runTests().then(results => {
  console.log('\n✅ Test complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});