#!/usr/bin/env tsx

/**
 * Quick schema test
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

async function quickTest() {
  console.log('🔍 Quick Schema Test');

  const serverProcess = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: '/home/lucas_galdino/repositories/mcp_servers/mcp-server-deep-code-reasoning-mcp',
    env: {
      ...process.env,
      GEMINI_API_KEY: 'test-key-123',
      NODE_ENV: 'development'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const readline = createInterface({
    input: serverProcess.stdout!,
    terminal: false
  });

  let step = 0;

  setTimeout(() => {
    console.log('📤 Sending init...');
    serverProcess.stdin!.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 'init',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0' }
      }
    }) + '\n');
    step = 1;
  }, 500);

  readline.on('line', (line) => {
    try {
      const msg = JSON.parse(line);
      if (!msg.jsonrpc) return;

      console.log('📥 Response:', msg.method || `response-${msg.id}`);

      if (step === 1 && msg.id === 'init') {
        console.log('📤 Sending initialized...');
        serverProcess.stdin!.write(JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized'
        }) + '\n');
        step = 2;

        setTimeout(() => {
          console.log('📤 Testing escalate_analysis with EMPTY parameters...');
          serverProcess.stdin!.write(JSON.stringify({
            jsonrpc: '2.0',
            id: 'test-empty',
            method: 'tools/call',
            params: {
              name: 'escalate_analysis',
              arguments: {} // EMPTY OBJECT
            }
          }) + '\n');
        }, 100);
      }

      if (msg.id === 'test-empty') {
        console.log('📥 RESULT:', msg.error ? `ERROR: ${msg.error.message}` : 'SUCCESS');
        serverProcess.kill();
        process.exit(0);
      }
    } catch (e) {
      // ignore non-JSON
    }
  });

  setTimeout(() => {
    serverProcess.kill();
    process.exit(1);
  }, 10000);
}

quickTest();