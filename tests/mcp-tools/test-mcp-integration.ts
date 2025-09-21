#!/usr/bin/env tsx

/**
 * VS Code MCP Integration Test Script
 * 
 * This script simulates how VS Code Copilot Chat calls our MCP tools,
 * helping us debug parameter validation issues.
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
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
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

    let initStep = 0; // 0 = not started, 1 = init sent, 2 = initialized notification sent, 3 = ready for tools

    // Send initialize request immediately when server starts
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
        
        console.log('📤 Sending init:', JSON.stringify(initRequest));
        serverProcess.stdin!.write(JSON.stringify(initRequest) + '\n');
        initStep = 1;
      }
    }, 500); // Give server time to start

    // Handle server messages
    readline.on('line', (line) => {
      try {
        const message = JSON.parse(line);
        
        // Skip log messages
        if (!message.jsonrpc) {
          return;
        }

        console.log('📥 Received:', JSON.stringify(message, null, 2));

        // Handle initialization sequence
        if (initStep === 1 && message.id === 'init' && message.result) {
          // Initialize response received, send initialized notification
          const initializedNotification = {
            jsonrpc: '2.0',
            method: 'notifications/initialized'
          };
          
          console.log('📤 Sending initialized notification:', JSON.stringify(initializedNotification));
          serverProcess.stdin!.write(JSON.stringify(initializedNotification) + '\n');
          initStep = 2;
          
          // Now send the tool request
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

            console.log('📤 Sending tool request:', JSON.stringify(toolRequest, null, 2));
            serverProcess.stdin!.write(JSON.stringify(toolRequest) + '\n');
          }, 100);
        }

        // Handle tool responses
        if (message.id && message.id.toString().startsWith('test-')) {
          serverProcess.kill();
          resolve(message);
        }
      } catch (error) {
        // Ignore non-JSON lines (probably logs)
      }
    });

    // Handle errors
    serverProcess.stderr!.on('data', (data) => {
      console.log('📄 Server log:', data.toString());
    });

    serverProcess.on('error', (error) => {
      reject(error);
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.log(`❌ Server exited with code ${code}`);
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      serverProcess.kill();
      reject(new Error('Test timeout'));
    }, 30000);
  });
}

async function runTests() {
  console.log('🧪 Starting VS Code MCP Integration Tests\n');

  // Test 1: debug_parameters (should always work)
  console.log('=== Test 1: debug_parameters ===');
  try {
    const result1 = await testMCPTool('debug_parameters', {
      test_param: 'hello world',
      nested: { value: 123 }
    });
    console.log('✅ debug_parameters test passed');
    console.log('Result:', JSON.stringify(result1.result, null, 2));
  } catch (error) {
    console.log('❌ debug_parameters test failed:', error);
  }

  console.log('\n=== Test 2: escalate_analysis (may fail without API key) ===');
  try {
    const result2 = await testMCPTool('escalate_analysis', {
      claude_context: {
        attempted_approaches: ["Tried static analysis", "Attempted code review"],
        partial_findings: [{"issue": "potential bug in loop"}],
        stuck_description: "Cannot determine root cause of performance issue",
        code_scope: {
          files: ["src/example.ts"],
          entry_points: [{"file": "src/example.ts", "line": 10, "function_name": "processData"}],
          service_names: ["DataProcessor"]
        }
      },
      analysis_type: "performance",
      depth_level: 3,
      time_budget_seconds: 60
    });
    console.log('✅ escalate_analysis test passed');
    console.log('Result snippet:', JSON.stringify(result2.result, null, 2).substring(0, 500));
  } catch (error) {
    console.log('❌ escalate_analysis test failed:', error);
  }

  console.log('\n=== Test 3: run_hypothesis_tournament (may fail without API key) ===');
  try {
    const result3 = await testMCPTool('run_hypothesis_tournament', {
      hypotheses: ["Memory leak in event handler", "Race condition in async operations"],
      file_paths: ["src/example.ts"],
      tournament_type: "parallel",
      context_budget: 120,
      claude_context: {
        attempted_approaches: ["Manual code review"],
        partial_findings: [{"finding": "Multiple async operations"}],
        stuck_description: "Cannot isolate the root cause",
        code_scope: {
          files: ["src/example.ts"],
          entry_points: [],
          service_names: []
        }
      },
      issue: "Performance degradation in production"
    });
    console.log('✅ run_hypothesis_tournament test passed');
    console.log('Result snippet:', JSON.stringify(result3.result, null, 2).substring(0, 500));
  } catch (error) {
    console.log('❌ run_hypothesis_tournament test failed:', error);
  }

  console.log('\n🏁 Integration tests completed');
}

// Run the tests
runTests().catch(console.error);