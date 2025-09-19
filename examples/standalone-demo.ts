#!/usr/bin/env npx tsx
/**
 * Standalone Demo of Deep Code Reasoning MCP Server
 * This demonstrates the actual services working together without MCP context
 */

import dotenv from 'dotenv';
import { ConversationalGeminiService } from '../src/services/conversational-gemini-service.js';
import { ConversationManager } from '../src/services/conversation-manager.js';
import { GeminiService } from '../src/services/gemini-service.js';
import { DeepCodeReasonerV2 } from '../src/analyzers/deep-code-reasoner-v2.js';
import type { ClaudeCodeContext } from '../src/models/types.js';

// Load environment variables
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment variables');
  process.exit(1);
}

// Sample problematic code for analysis
const sampleCode = `
class OrderService {
  async getOrdersWithDetails(userId: string) {
    // N+1 query problem
    const orders = await this.db.query('SELECT * FROM orders WHERE user_id = ?', [userId]);
    
    for (const order of orders) {
      // This creates N additional queries!
      order.items = await this.db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      
      for (const item of order.items) {
        // Even more queries!
        item.product = await this.db.query('SELECT * FROM products WHERE id = ?', [item.product_id]);
      }
    }
    
    return orders;
  }
}
`;

async function demonstrateConversationalAnalysis() {
  console.log("🚀 Deep Code Reasoning MCP Server - Standalone Demo");
  console.log("=".repeat(60));
  
  try {
    // Initialize services with correct constructors
    const geminiService = new GeminiService(GEMINI_API_KEY!);
    const conversationalService = new ConversationalGeminiService(GEMINI_API_KEY!);
    const conversationManager = new ConversationManager();
    const deepReasoner = new DeepCodeReasonerV2(GEMINI_API_KEY!);
    
    console.log("✅ Services initialized successfully");
    
    // Create Claude context with correct property names
    const claudeContext: ClaudeCodeContext = {
      attemptedApproaches: [
        "Searched for N+1 query patterns",
        "Checked for obvious loops",
        "Analyzed database calls"
      ],
      partialFindings: [
        { 
          type: "performance", 
          severity: "high",
          location: { file: "OrderService.ts", line: 5 },
          description: "Found repeated DB calls in OrderService",
          evidence: ["Multiple queries in loop structure"]
        }
      ],
      stuckPoints: ["Can't determine if this is an N+1 query pattern or just necessary business logic"],
      focusArea: {
        files: ["OrderService.ts"],
        entryPoints: [{ file: "OrderService.ts", line: 3, functionName: "getOrdersWithDetails" }]
      },
      analysisBudgetRemaining: 120 // 2 minutes
    };
    
    // Demonstrate 1: Direct Gemini Analysis
    console.log("\n📊 Demo 1: Direct Gemini Analysis");
    console.log("-".repeat(40));
    
    const codeFiles = new Map([
      ["OrderService.ts", sampleCode]
    ]);
    
    const directAnalysis = await geminiService.analyzeWithGemini(
      claudeContext,
      "performance",
      codeFiles
    );
    
    console.log("🔍 Analysis Result:");
    console.log("Root causes found:", directAnalysis.findings.rootCauses.length);
    directAnalysis.findings.rootCauses.forEach((cause, i) => {
      console.log(`  ${i + 1}. ${cause.type}: ${cause.description} (confidence: ${cause.confidence})`);
    });
    
    console.log("Performance bottlenecks found:", directAnalysis.findings.performanceBottlenecks.length);
    directAnalysis.findings.performanceBottlenecks.forEach((bottleneck, i) => {
      console.log(`  ${i + 1}. ${bottleneck.type}: ${bottleneck.suggestion}`);
    });
    
    // Demonstrate 2: Conversational Analysis
    console.log("\n💬 Demo 2: Conversational Analysis with Claude Context");
    console.log("-".repeat(50));
    
    // Start conversation
    const sessionId = "demo-session-" + Date.now();
    const startResult = await conversationalService.startConversation(
      sessionId,
      claudeContext,
      "performance",
      codeFiles,
      "Is this an N+1 query pattern? How can we optimize it?"
    );
    
    console.log("🤖 Gemini's Initial Response:");
    console.log(startResult.response);
    console.log("\n💡 Suggested Follow-ups:");
    startResult.suggestedFollowUps.forEach((suggestion, i) => {
      console.log(`  ${i + 1}. ${suggestion}`);
    });
    
    // Continue conversation
    const continueResult = await conversationalService.continueConversation(
      sessionId,
      "Can you show me exactly how to fix this with a JOIN query?"
    );
    
    console.log("\n🔧 Gemini's Solution:");
    console.log(continueResult.response);
    
    // Demonstrate 3: Deep Code Reasoning (Escalation from Claude)
    console.log("\n🧠 Demo 3: Deep Code Reasoning (Escalation from Claude)");
    console.log("-".repeat(55));
    
    const deepAnalysis = await deepReasoner.escalateFromClaudeCode(
      claudeContext,
      "performance",
      3 // depth level
    );
    
    console.log("🎯 Deep Analysis Result:");
    console.log("Root Causes:", deepAnalysis.findings.rootCauses);
    console.log("Recommendations:", deepAnalysis.recommendations.immediateActions);
    
    // Clean up
    conversationManager.destroy();
    
    console.log("\n✅ Demo completed successfully!");
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      if (error.stack) {
        console.error("Stack trace:", error.stack.split('\n').slice(0, 5).join('\n'));
      }
    }
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateConversationalAnalysis();
}

export { demonstrateConversationalAnalysis };
