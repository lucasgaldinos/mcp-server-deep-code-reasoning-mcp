#!/usr/bin/env tsx
/**
 * Comprehensive test script for all 17 MCP tools
 * Tests parameter validation and basic functionality
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import path from 'path';

// All 17 MCP tools with test parameters
const ALL_TOOLS = [
  // ✅ Already working (8/17)
  {
    name: 'debug_parameters',
    params: { testParam: 'hello' },
    shouldWork: true,
    category: 'debug'
  },
  {
    name: 'test_simple_tool', 
    params: { attempted_approaches: ['test1'], partial_findings: [{ finding: 'test' }] },
    shouldWork: true,
    category: 'debug'
  },
  {
    name: 'escalate_analysis',
    params: {
      attempted_approaches: ['semantic search'],
      partial_findings: [{ file: 'test.ts', issue: 'unknown' }],
      stuck_description: ['parameter validation'],
      code_scope: { files: ['src/index.ts'] },
      analysis_type: 'execution_trace'
    },
    shouldWork: true,
    category: 'analysis'
  },
  {
    name: 'escalate_analysis_minimal',
    params: {
      attempted_approaches: ['grep search'],
      partial_findings: [{ error: 'not found' }]
    },
    shouldWork: true,
    category: 'analysis'
  },
  {
    name: 'health_check',
    params: {},
    shouldWork: true,
    category: 'system'
  },
  {
    name: 'health_summary',
    params: { include_details: true },
    shouldWork: true,
    category: 'system'
  },
  {
    name: 'get_model_info',
    params: {},
    shouldWork: true,
    category: 'system'
  },
  {
    name: 'set_model',
    params: { model: 'gemini-2.5-pro' },
    shouldWork: true,
    category: 'system'
  },

  // ❌ Need to test and potentially fix (9/17)
  {
    name: 'trace_execution_path',
    params: {
      entryPoint: { file: 'src/index.ts', line: 100, functionName: 'main' },
      maxDepth: 5,
      includeDataFlow: true
    },
    shouldWork: false,
    category: 'analysis'
  },
  {
    name: 'hypothesis_test',
    params: {
      hypothesis: 'Parameter validation causes tool failures',
      codeScope: { files: ['src/index.ts'] },
      testApproach: 'check Zod vs JSON Schema conflicts'
    },
    shouldWork: false,
    category: 'analysis'
  },
  {
    name: 'cross_system_impact',
    params: {
      changeScope: { files: ['src/index.ts'], serviceNames: ['mcp-server'] },
      impactTypes: ['breaking']
    },
    shouldWork: false,
    category: 'analysis'
  },
  {
    name: 'performance_bottleneck',
    params: {
      codePath: {
        entryPoint: { file: 'src/index.ts', line: 200, functionName: 'handleRequest' },
        suspectedIssues: ['parameter validation overhead']
      },
      profileDepth: 3
    },
    shouldWork: false,
    category: 'analysis'
  },
  {
    name: 'start_conversation',
    params: {
      attempted_approaches: JSON.stringify(['debug', 'test']),
      partial_findings: JSON.stringify([{ issue: 'validation' }]),
      stuck_description: JSON.stringify(['parameter conflicts']),
      code_scope_files: JSON.stringify(['src/index.ts']),
      analysisType: 'execution_trace',
      initialQuestion: 'Why are tools failing?'
    },
    shouldWork: false,
    category: 'conversation'
  },
  {
    name: 'continue_conversation',
    params: {
      sessionId: 'test-session-123',
      message: 'Please analyze the parameter validation issue',
      includeCodeSnippets: true
    },
    shouldWork: false,
    category: 'conversation'
  },
  {
    name: 'finalize_conversation',
    params: {
      sessionId: 'test-session-123',
      summaryFormat: 'detailed'
    },
    shouldWork: false,
    category: 'conversation'
  },
  {
    name: 'get_conversation_status',
    params: {
      sessionId: 'test-session-123'
    },
    shouldWork: false,
    category: 'conversation'
  },
  {
    name: 'run_hypothesis_tournament',
    params: {
      attempted_approaches: ['validation bypass'],
      partial_findings: [{ success: 'escalate_analysis working' }],
      stuck_description: ['other tools failing'],
      code_scope: { files: ['src/index.ts'] },
      issue: 'MCP tool parameter validation',
      tournament_config: { max_hypotheses: 3, max_rounds: 2 }
    },
    shouldWork: false,
    category: 'analysis'
  }
];

interface TestResult {
  name: string;
  success: boolean;
  responseReceived: boolean;
  errorMessage?: string;
  responseText?: string;
  category: string;
  expectedToWork: boolean;
}

async function testTool(toolName: string, params: any): Promise<TestResult> {
  console.log(`\n🧪 Testing ${toolName}...`);
  
  return new Promise((resolve) => {
    const mcpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      }
    };

    const child = spawn('npm', ['run', 'dev'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let output = '';
    let errorOutput = '';
    let testCompleted = false;

    const timeout = setTimeout(() => {
      if (!testCompleted) {
        testCompleted = true;
        child.kill();
        resolve({
          name: toolName,
          success: false,
          responseReceived: false,
          errorMessage: 'Test timeout after 10 seconds',
          category: 'unknown',
          expectedToWork: false
        });
      }
    }, 10000);

    child.stdout.on('data', (data) => {
      output += data.toString();
      
      // Look for MCP server ready indication
      if (output.includes('MCP server running') || output.includes('Server running')) {
        // Send the tool request
        child.stdin.write(JSON.stringify(mcpRequest) + '\n');
      }
      
      // Look for JSON response
      if (output.includes('"content"') && output.includes('"type"')) {
        if (!testCompleted) {
          testCompleted = true;
          clearTimeout(timeout);
          child.kill();
          
          // Try to extract the JSON response
          const lines = output.split('\n');
          let jsonResponse = null;
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.content || parsed.error) {
                jsonResponse = parsed;
                break;
              }
            } catch (e) {
              // Continue looking
            }
          }
          
          resolve({
            name: toolName,
            success: jsonResponse !== null && !jsonResponse.error,
            responseReceived: jsonResponse !== null,
            responseText: jsonResponse ? JSON.stringify(jsonResponse, null, 2) : output.slice(-500),
            errorMessage: jsonResponse?.error || undefined,
            category: 'unknown',
            expectedToWork: false
          });
        }
      }
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (!testCompleted) {
        testCompleted = true;
        clearTimeout(timeout);
        resolve({
          name: toolName,
          success: false,
          responseReceived: false,
          errorMessage: `Process exited with code ${code}. Error: ${errorOutput.slice(-300)}`,
          category: 'unknown',
          expectedToWork: false
        });
      }
    });
  });
}

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting comprehensive MCP tool testing...\n');
  console.log(`Testing all ${ALL_TOOLS.length} tools:\n`);

  const results: TestResult[] = [];
  
  for (const tool of ALL_TOOLS) {
    const result = await testTool(tool.name, tool.params);
    result.category = tool.category;
    result.expectedToWork = tool.shouldWork;
    results.push(result);
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate comprehensive report
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(80));

  const byCategory = results.reduce((acc, result) => {
    if (!acc[result.category]) acc[result.category] = [];
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  let totalWorking = 0;
  let totalExpectedWorking = 0;

  for (const [category, categoryResults] of Object.entries(byCategory)) {
    console.log(`\n📂 ${category.toUpperCase()} TOOLS:`);
    
    for (const result of categoryResults) {
      const status = result.success ? '✅' : '❌';
      const expected = result.expectedToWork ? '(expected ✅)' : '(expected ❌)';
      console.log(`  ${status} ${result.name} ${expected}`);
      
      if (result.success) totalWorking++;
      if (result.expectedToWork) totalExpectedWorking++;
      
      if (!result.success && result.errorMessage) {
        console.log(`     Error: ${result.errorMessage.slice(0, 100)}...`);
      }
    }
  }

  console.log('\n' + '-'.repeat(50));
  console.log(`📈 SUMMARY:`);
  console.log(`   Working tools: ${totalWorking}/${results.length} (${Math.round(totalWorking/results.length*100)}%)`);
  console.log(`   Expected working: ${totalExpectedWorking}/${results.length}`);
  console.log(`   New successes: ${Math.max(0, totalWorking - totalExpectedWorking)} tools`);
  console.log(`   Need fixing: ${results.filter(r => !r.success).length} tools`);

  // Tools that need fixing
  const failingTools = results.filter(r => !r.success);
  if (failingTools.length > 0) {
    console.log(`\n🔧 TOOLS NEEDING FIXES:`);
    failingTools.forEach(tool => {
      console.log(`   ❌ ${tool.name} (${tool.category})`);
    });
  }

  // Success indicators
  if (totalWorking >= 15) {
    console.log('\n🎉 EXCELLENT! Most tools are working!');
  } else if (totalWorking >= 10) {
    console.log('\n👍 GOOD progress! More than half working!');
  } else {
    console.log('\n⚠️  More work needed - many tools still failing');
  }

  // Save detailed results
  const reportData = {
    timestamp: new Date().toISOString(),
    totalTools: results.length,
    workingTools: totalWorking,
    failingTools: failingTools.length,
    results: results,
    summary: {
      byCategory: Object.entries(byCategory).map(([cat, tools]) => ({
        category: cat,
        total: tools.length,
        working: tools.filter(t => t.success).length,
        failing: tools.filter(t => !t.success).length
      }))
    }
  };

  writeFileSync('mcp-tool-test-results.json', JSON.stringify(reportData, null, 2));
  console.log('\n💾 Detailed results saved to mcp-tool-test-results.json');
}

// Run the tests
runAllTests().catch(console.error);