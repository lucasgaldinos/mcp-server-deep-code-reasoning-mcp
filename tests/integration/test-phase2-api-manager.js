#!/usr/bin/env node

/**
 * Phase 2 API Manager Integration Test
 * Tests the multi-provider fallback system with output optimization
 */

import { ApiManager } from "./dist/src/services/ApiManager.js";
import { GeminiService } from "./dist/src/services/GeminiService.js";
import { OpenAIService } from "./dist/src/services/OpenAIService.js";
import { ResponseFormatter } from "./dist/src/utils/ResponseFormatter.js";
import { MemoryOptimizer } from "./dist/src/utils/MemoryOptimizer.js";

async function testPhase2Implementation() {
	console.log("🚀 Phase 2 Multi-Provider API Test");
	console.log("=====================================\n");

	// Track initial memory usage
	const initialMemory = process.memoryUsage();
	console.log(
		`📊 Initial Memory Usage: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB\n`
	);

	try {
		// Initialize Memory Optimizer
		console.log("🧠 Initializing Memory Optimizer...");
		const memoryOptimizer = MemoryOptimizer.getInstance();
		console.log("✅ Memory Optimizer initialized\n");

		// Initialize Response Formatter
		console.log("📋 Initializing Response Formatter...");
		const responseFormatter = new ResponseFormatter();
		console.log("✅ Response Formatter initialized\n");

		// Initialize API providers
		console.log("🔧 Initializing API Providers...");

		// Gemini Service (Primary)
		const geminiService = new GeminiService({
			apiKey: process.env.GEMINI_API_KEY || "test-key",
		});

		// OpenAI Service (Fallback)
		const openAIService = new OpenAIService({
			apiKey: process.env.OPENAI_API_KEY || "test-key",
			model: "gpt-4-turbo-preview",
		});

		console.log("✅ API Providers initialized\n");

		// Initialize API Manager with providers
		console.log("🎯 Initializing API Manager...");

		// Configure API Manager with providers
		const apiManagerConfig = {
			providers: [geminiService, openAIService], // Will be sorted by priority internally
			retryAttempts: 3,
			timeoutMs: 30000,
			enableCaching: true,
			costBudget: 1.0, // $1 budget
		};

		const apiManager = new ApiManager(apiManagerConfig);

		console.log(
			"✅ API Manager initialized with multi-provider fallback\n"
		);

		// Test provider availability
		console.log("🔍 Testing Provider Availability...");
		const recommendedProvider = await apiManager.getRecommendedProvider();
		console.log(
			`📡 Recommended Provider: ${recommendedProvider || "None available"}\n`
		);

		// Prepare test context
		const testContext = {
			attemptedApproaches: ["basic analysis"],
			partialFindings: [],
			stuckPoints: ["complex execution flow"],
			focusArea: {
				files: ["test-scenario/UserService.ts"],
				entryPoints: [
					{
						file: "test-scenario/UserService.ts",
						line: 1,
						functionName: "UserService",
					},
				],
			},
			analysisBudgetRemaining: 300,
		};

		// Test analysis with fallback system
		console.log("🧪 Testing Multi-Provider Analysis...");
		const startTime = Date.now();

		try {
			const result = await apiManager.analyzeWithFallback(
				testContext,
				"execution_trace"
			);
			const executionTime = Date.now() - startTime;

			console.log("🎉 Analysis Successful!");
			console.log(`⚡ Execution Time: ${executionTime}ms`);
			console.log(
				`🤖 Provider Used: ${result.metadata?.provider || "unknown"}`
			);
			console.log(
				`🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`
			);
			console.log(
				`📝 Analysis Length: ${result.analysis.length} characters\n`
			);

			// Test response formatting
			console.log("📋 Testing Response Formatting...");
			const formattedResult =
				await responseFormatter.formatAnalysisResult(result);

			console.log("✅ Response Formatting Complete:");
			console.log(
				`📏 Formatted Length: ${formattedResult.analysis.length} characters`
			);
			console.log(
				`🎯 Confidence: ${(formattedResult.confidence * 100).toFixed(1)}%`
			);
			console.log(
				`📊 Quality Score: ${formattedResult.metadata?.qualityScore || "N/A"}\n`
			);

			// Test memory optimization
			console.log("🧠 Testing Memory Optimization...");
			const optimizationResult =
				await memoryOptimizer.forceOptimization();

			const finalMemory = process.memoryUsage();
			const memoryEfficiency =
				memoryOptimizer.calculateMemoryEfficiency();

			console.log("💾 Memory Optimization Results:");
			console.log(
				`📊 Initial Memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`
			);
			console.log(
				`📊 Final Memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`
			);
			console.log(
				`⚡ Memory Efficiency: ${(memoryEfficiency * 100).toFixed(1)}%`
			);

			// Check if we met our performance targets
			const memoryTarget = 60; // 60% efficiency target
			const timeTarget = 150; // 150ms target from performance report

			console.log("\n🎯 Performance Target Analysis:");
			console.log(
				`⏱️  Response Time: ${executionTime}ms (Target: <${timeTarget}ms) ${executionTime < timeTarget ? "✅" : "❌"}`
			);
			console.log(
				`🧠 Memory Efficiency: ${(memoryEfficiency * 100).toFixed(1)}% (Target: >${memoryTarget}%) ${memoryEfficiency * 100 > memoryTarget ? "✅" : "❌"}`
			);

			// Test API Manager statistics
			console.log("\n📈 API Manager Statistics:");
			const stats = apiManager.getProviderStats();
			for (const [provider, stat] of Object.entries(stats)) {
				console.log(`🤖 ${provider}:`);
				console.log(`   📞 Calls: ${stat.calls}`);
				console.log(`   ✅ Success Rate: ${stat.successRate}`);
				console.log(`   ❌ Failures: ${stat.failures}`);
				console.log(`   ⚡ Avg Time: ${stat.averageTime}`);
			}
		} catch (error) {
			console.error("❌ Analysis failed:", error.message);

			// Test fallback behavior
			console.log("\n🔄 Testing Fallback Behavior...");
			const stats = apiManager.getProviderStats();
			console.log("📊 Provider Statistics after failure:");
			for (const [provider, stat] of Object.entries(stats)) {
				console.log(
					`🤖 ${provider}: ${stat.failures} failures, ${stat.calls} total calls`
				);
			}
		}
	} catch (error) {
		console.error("💥 Test failed:", error);
		console.error(error.stack);
	}

	console.log("\n🏁 Phase 2 Integration Test Complete");
}

// Handle process events
process.on("uncaughtException", (error) => {
	console.error("💥 Uncaught Exception:", error);
	process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
	console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
	process.exit(1);
});

// Run the test
testPhase2Implementation().catch((error) => {
	console.error("💥 Test execution failed:", error);
	process.exit(1);
});
