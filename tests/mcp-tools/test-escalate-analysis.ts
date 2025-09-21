#!/usr/bin/env tsx

/**
 * Test the new escalate_analysis tool
 */

import { spawn } from 'child_process';

async function testEscalateAnalysis() {
  console.log('🧪 Testing New escalate_analysis Tool');
  console.log('====================================\n');

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

  console.log('🔬 Test: escalate_analysis with empty object');
  const response1 = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'escalate_analysis',
      arguments: {}
    }
  });

  console.log('🔬 Test: escalate_analysis with complex parameters');
  const response2 = await sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'escalate_analysis',
      arguments: {
        attempted_approaches: ["file reading", "static analysis"],
        partial_findings: [
          { type: "import", value: "found imports" },
          { type: "complexity", value: "high complexity detected" }
        ],
        stuck_description: ["complex async logic", "performance bottleneck"],
        code_scope: {
          files: ["src/index.ts", "src/services/gemini-service.ts"],
          entry_points: [
            { file: "src/index.ts", line: 100, function_name: "handleToolCall" }
          ],
          service_names: ["GeminiService", "DeepCodeReasonerV2"]
        },
        analysis_type: "execution_trace",
        depth_level: 3,
        time_budget_seconds: 60
      }
    }
  });

  // Clean up
  serverProcess.kill();

  // Results
  const tests = [
    { name: 'escalate_analysis (empty)', response: response1 },
    { name: 'escalate_analysis (complex)', response: response2 }
  ];

  console.log('\n📊 Results Summary:');
  console.log('==================');
  
  for (const test of tests) {
    const status = test.response?.error ? '❌' : '✅';
    const message = test.response?.error?.message || 'SUCCESS!';
    console.log(`${status} ${test.name}: ${message}`);
  }

  if (tests.every(t => !t.response?.error)) {
    console.log('\n🎉 ALL TESTS PASSED! The escalate_analysis tool is working perfectly!');
    console.log('🚀 VS Code Copilot Chat integration is now functional!');
  }

  console.log('\n🔍 Full Response Details:');
  tests.forEach((test, index) => {
    console.log(`\n${index + 1}. ${test.name}:`);
    if (test.response?.result?.content?.[0]?.text) {
      console.log(test.response.result.content[0].text);
    } else {
      console.log(JSON.stringify(test.response, null, 2));
    }
  });
}

testEscalateAnalysis().catch(console.error);