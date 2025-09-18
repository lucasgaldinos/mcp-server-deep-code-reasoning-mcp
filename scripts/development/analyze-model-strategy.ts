#!/usr/bin/env tsx
/**
 * Multi-Model Framework Analysis Tool
 * 
 * Analyzes request patterns and provides model recommendations for the
 * Deep Code Reasoning MCP server's multi-model architecture
 */

import { ModelStrategy } from '../../src/utils/model-strategy.js';

console.log('🤖 Deep Code Reasoning MCP - Multi-Model Framework Analysis\n');

// Get all tool recommendations
const recommendations = ModelStrategy.getToolRecommendations();

console.log('📊 MODEL RECOMMENDATIONS BY TOOL:');
console.log('=' .repeat(80));

Object.entries(recommendations).forEach(([tool, rec]) => {
  console.log(`\n🔧 ${tool}:`);
  console.log(`   Model: ${rec.model}`);
  console.log(`   Reasoning: ${rec.reasoning}`);
});

console.log('\n\n🎯 FRAMEWORK STRATEGY ANALYSIS:');
console.log('=' .repeat(80));

// Group tools by recommended model
const modelGroups = Object.entries(recommendations).reduce((acc, [tool, rec]) => {
  if (!acc[rec.model]) acc[rec.model] = [];
  acc[rec.model].push(tool);
  return acc;
}, {} as Record<string, string[]>);

Object.entries(modelGroups).forEach(([model, tools]) => {
  const config = ModelStrategy.getModelConfig(model)!;
  console.log(`\n📱 ${model} (${config.rateLimit.requestsPerMinute} RPM, ${config.rateLimit.requestsPerDay} RPD):`);
  console.log(`   Quality Score: ${config.qualityScore}/10`);
  console.log(`   Best For: ${config.description}`);
  console.log(`   Tools: ${tools.join(', ')}`);
});

console.log('\n\n⚠️ RATE LIMIT WARNINGS:');
console.log('=' .repeat(80));

// Check current model (from environment) against each tool
const currentModel = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
console.log(`Current model: ${currentModel}\n`);

Object.keys(recommendations).forEach(tool => {
  const validation = ModelStrategy.validateModelForTool(currentModel, tool);
  if (!validation.safe) {
    console.log(`🚨 ${tool}: ${validation.warning}`);
    console.log(`   ➜ Recommended: ${validation.recommendation}`);
  } else if (validation.warning) {
    console.log(`⚠️  ${tool}: ${validation.warning}`);
  }
});

console.log('\n\n🚀 IMPLEMENTATION STRATEGIES:');
console.log('=' .repeat(80));

console.log(`
1. **Single Model Strategy** (Current):
   - Use one model for all tools: ${currentModel}
   - Pros: Simple configuration
   - Cons: Rate limits constrain high-volume tools

2. **Dynamic Model Selection** (Recommended):
   - Each tool uses optimal model automatically
   - Pros: Best performance and rate limit management
   - Cons: More complex configuration

3. **Tiered Model Strategy**:
   - Low-volume: gemini-2.5-pro (highest quality)
   - Medium-volume: gemini-2.5-flash (balanced)
   - High-volume: gemini-2.0-flash (fastest)

4. **Request Queuing Strategy**:
   - Batch requests to stay within rate limits
   - Pros: Uses preferred high-quality model
   - Cons: Slower response times for tournaments
`);

console.log('\n\n💡 RECOMMENDED NEXT STEPS:');
console.log('=' .repeat(80));

console.log(`
1. **Immediate**: Switch to gemini-2.5-flash for better rate limits
2. **Short-term**: Implement dynamic model selection per tool
3. **Long-term**: Add OpenAI integration for true multi-model architecture
4. **Testing**: Validate tournament performance with different models

🔧 Quick fix: Update .env to GEMINI_MODEL=gemini-2.5-flash
`);