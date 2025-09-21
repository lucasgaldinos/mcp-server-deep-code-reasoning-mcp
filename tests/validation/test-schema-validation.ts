#!/usr/bin/env tsx

/**
 * VS Code MCP Integration Test - Schema Validation Fix
 * 
 * Testing with corrected parameter structures that match the actual Zod schemas.
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

async function testMCPTool(toolName: string, params: any): Promise<MCPResponse> {
  return new Promise((resolve, reject) => {
    // Start the MCP server
    const serverProcess = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: '/home/lucas_galdino/repositories/mcp_servers/mcp-server-deep-code-reasoning-mcp',
      env: {
        ...process.env,
        // Add a test API key
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'test-key-123',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'test-openai-key',
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const readline = createInterface({
      input: serverProcess.stdout!,
      output: process.stdout,
      terminal: false
    });

    let initStep = 0;

    // Send initialize request
    setTimeout(() => {
      if (initStep === 0) {
        const initRequest: MCPRequest = {
          jsonrpc: '2.0',
          id: 'init',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {
              roots: { listChanged: true },
              sampling: {}
            },
            clientInfo: {
              name: 'test-client',
              version: '1.0.0'
            }
          }
        };
        
        console.log('📤 Sending init request');
        serverProcess.stdin!.write(JSON.stringify(initRequest) + '\n');
        initStep = 1;
      }
    }, 500);

    // Handle server messages
    readline.on('line', (line) => {
      try {
        const message = JSON.parse(line);
        
        if (!message.jsonrpc) {
          return;
        }

        console.log('📥 Received message type:', message.method || `response-${message.id}`);

        if (initStep === 1 && message.id === 'init' && message.result) {
          const initializedNotification = {
            jsonrpc: '2.0',
            method: 'notifications/initialized'
          };
          
          console.log('📤 Sending initialized notification');
          serverProcess.stdin!.write(JSON.stringify(initializedNotification) + '\n');
          initStep = 2;
          
          setTimeout(() => {
            const toolRequest: MCPRequest = {
              jsonrpc: '2.0',
              id: `test-${toolName}`,
              method: 'tools/call',
              params: {
                name: toolName,
                arguments: params
              }
            };

            console.log('📤 Sending tool request:', toolName);
            console.log('📤 Parameters:', JSON.stringify(params, null, 2));
            serverProcess.stdin!.write(JSON.stringify(toolRequest) + '\n');
          }, 100);
        }

        if (message.id && message.id.toString().startsWith('test-')) {
          serverProcess.kill();
          resolve(message);
        }
      } catch (error) {
        // Ignore non-JSON lines
      }
    });

    serverProcess.stderr!.on('data', (data) => {
      const logText = data.toString();
      if (logText.includes('ERROR') || logText.includes('error')) {
        console.log('🚨 Error log:', logText.trim());
      }
    });

    serverProcess.on('error', (error) => {
      reject(error);
    });

    setTimeout(() => {
      serverProcess.kill();
      reject(new Error('Test timeout'));
    }, 15000);
  });
}

async function runTests() {
  console.log('🧪 Testing MCP Tools with Corrected Parameter Schemas\n');

  // Test 1: debug_parameters (should always work)
  console.log('=== Test 1: debug_parameters ===');
  try {
    const result1 = await testMCPTool('debug_parameters', {
      test_param: 'hello world',
      nested: { value: 123 }
    });
    
    if (result1.result) {
      console.log('✅ debug_parameters SUCCESS');
    } else if (result1.error) {
      console.log('❌ debug_parameters FAILED:', result1.error.message);
    }
  } catch (error) {
    console.log('❌ debug_parameters EXCEPTION:', error);
  }

  // Test 2: escalate_analysis with CORRECTED schema
  console.log('\n=== Test 2: escalate_analysis (corrected schema) ===');
  try {
    const result2 = await testMCPTool('escalate_analysis', {
      // Correct flat structure according to EscalateAnalysisSchemaFlat
      attempted_approaches: ["Tried static analysis", "Attempted code review"],
      partial_findings: [{"issue": "potential bug in loop"}],
      stuck_description: ["Cannot determine root cause of performance issue"],
      code_scope: {
        files: ["src/example.ts"],
        entry_points: [{"file": "src/example.ts", "line": 10, "function_name": "processData"}],
        service_names: ["DataProcessor"]
      },
      analysis_type: "performance",
      depth_level: 3,
      time_budget_seconds: 60
    });
    
    if (result2.result) {
      console.log('✅ escalate_analysis SUCCESS');
      const content = result2.result.content?.[0]?.text || '';
      if (content.includes('⚠️')) {
        console.log('📄 Result: No API key - graceful fallback message');
      } else {
        console.log('📄 Result: Analysis completed');
      }
    } else if (result2.error) {
      console.log('❌ escalate_analysis FAILED:', result2.error.message);
    }
  } catch (error) {
    console.log('❌ escalate_analysis EXCEPTION:', error);
  }

  // Test 3: run_hypothesis_tournament with CORRECTED schema
  console.log('\n=== Test 3: run_hypothesis_tournament (corrected schema) ===');
  try {
    const result3 = await testMCPTool('run_hypothesis_tournament', {
      // Correct structure according to RunHypothesisTournamentSchemaFlat
      attempted_approaches: ["Manual code review"],
      partial_findings: [{"finding": "Multiple async operations"}],
      stuck_description: ["Cannot isolate the root cause"],
      code_scope: {
        files: ["src/example.ts"],
        entry_points: [],
        service_names: []
      },
      issue: "Performance degradation in production",
      tournament_config: {
        max_hypotheses: 5,
        max_rounds: 3,
        parallel_sessions: 3
      }
    });
    
    if (result3.result) {
      console.log('✅ run_hypothesis_tournament SUCCESS');
      const content = result3.result.content?.[0]?.text || '';
      if (content.includes('⚠️')) {
        console.log('📄 Result: No API key - graceful fallback message');
      } else {
        console.log('📄 Result: Tournament completed');
      }
    } else if (result3.error) {
      console.log('❌ run_hypothesis_tournament FAILED:', result3.error.message);
    }
  } catch (error) {
    console.log('❌ run_hypothesis_tournament EXCEPTION:', error);
  }

  console.log('\n🎯 Summary: Testing parameter schema compliance for VS Code integration');
}

// Run the tests
runTests().catch(console.error);