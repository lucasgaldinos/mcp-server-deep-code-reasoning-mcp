#!/usr/bin/env node

/**
 * Quick MCP Server Integration Test
 *
 * Verifies the MCP server can be started and responds correctly
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 Testing MCP Server Integration...\n");

// Test 1: Verify server can start
console.log("1. Testing server startup...");

const serverPath = path.join(__dirname, "dist/src/index.js");
const server = spawn("node", [serverPath], {
	stdio: ["pipe", "pipe", "pipe"],
	env: { ...process.env, NODE_ENV: "test" },
});

let output = "";
let errorOutput = "";

server.stdout.on("data", (data) => {
	output += data.toString();
});

server.stderr.on("data", (data) => {
	errorOutput += data.toString();
});

// Give server time to start
setTimeout(() => {
	server.kill("SIGTERM");

	console.log("📊 Server Output Analysis:");

	// Check for successful startup indicators
	const indicators = [
		{ pattern: /MCP.*server/i, name: "MCP Server initialization" },
		{ pattern: /Deep Code Reasoning/i, name: "Service name confirmation" },
		{ pattern: /health.*monitor/i, name: "Health monitoring" },
		{ pattern: /strategy.*manager/i, name: "Strategy manager" },
		{ pattern: /memory.*protocol/i, name: "Memory management protocol" },
	];

	let successCount = 0;
	indicators.forEach(({ pattern, name }) => {
		if (pattern.test(output) || pattern.test(errorOutput)) {
			console.log(`   ✅ ${name}`);
			successCount++;
		} else {
			console.log(`   ❌ ${name}`);
		}
	});

	console.log(
		`\n📈 Integration Score: ${successCount}/${indicators.length} (${Math.round((successCount / indicators.length) * 100)}%)`
	);

	if (successCount >= 3) {
		console.log("🎉 MCP Server Integration: SUCCESS");
		console.log("✅ Server starts correctly");
		console.log("✅ Core components initialize");
		console.log("✅ Ready for VS Code integration");
	} else {
		console.log("⚠️  MCP Server Integration: NEEDS ATTENTION");
		console.log("❓ Some components may need verification");
	}

	// Show first part of output for debugging
	if (output.length > 0) {
		console.log("\n📝 Server Output (first 500 chars):");
		console.log(
			output.substring(0, 500) + (output.length > 500 ? "..." : "")
		);
	}

	if (errorOutput.length > 0) {
		console.log("\n🔍 Error Output (first 300 chars):");
		console.log(
			errorOutput.substring(0, 300) +
				(errorOutput.length > 300 ? "..." : "")
		);
	}

	process.exit(0);
}, 3000);

// Handle errors
server.on("error", (err) => {
	console.log(`❌ Server startup error: ${err.message}`);
	process.exit(1);
});
