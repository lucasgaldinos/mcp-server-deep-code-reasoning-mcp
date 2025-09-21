#!/usr/bin/env tsx

import { z } from 'zod';

// Test the exact schema from our code
const TestSchema = z.object({
  attempted_approaches: z.array(z.string()).optional().describe('What VS Code already tried'),
  partial_findings: z.array(z.any()).optional().describe('Any findings VS Code discovered'),
  stuck_description: z.array(z.string()).optional().describe('Description of where VS Code got stuck'),
  code_scope: z.object({
    files: z.array(z.string()).describe('Files to analyze'),
    entry_points: z.array(z.object({
      file: z.string(),
      line: z.number(),
      column: z.number().optional(),
      function_name: z.string().optional(),
    })).optional().describe('Specific functions/methods to start from'),
    service_names: z.array(z.string()).optional().describe('Services involved in cross-system analysis'),
  }).optional(),
  analysis_type: z.enum(['execution_trace', 'cross_system', 'performance', 'hypothesis_test']).optional().default('execution_trace'),
  depth_level: z.number().min(1).max(5).optional().default(3),
  time_budget_seconds: z.number().optional().default(60),
});

// Test 1: Empty object
console.log('🧪 Test 1: Empty object');
try {
  const result1 = TestSchema.parse({});
  console.log('✅ SUCCESS:', JSON.stringify(result1, null, 2));
} catch (error) {
  console.log('❌ FAILED:', error.message);
}

// Test 2: Partial object
console.log('\n🧪 Test 2: Partial object with some fields');
try {
  const result2 = TestSchema.parse({
    attempted_approaches: ["test"],
    analysis_type: "performance"
  });
  console.log('✅ SUCCESS:', JSON.stringify(result2, null, 2));
} catch (error) {
  console.log('❌ FAILED:', error.message);
}

// Test 3: Object with all required structure
console.log('\n🧪 Test 3: Complete object');
try {
  const result3 = TestSchema.parse({
    attempted_approaches: ["test"],
    partial_findings: [{"test": "data"}],
    stuck_description: ["test issue"],
    code_scope: {
      files: ["test.ts"]
    }
  });
  console.log('✅ SUCCESS:', JSON.stringify(result3, null, 2));
} catch (error) {
  console.log('❌ FAILED:', error.message);
}