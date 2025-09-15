# MCP Tools Comprehensive Guide

## Overview

This guide provides complete parameter examples for all 13 MCP tools in the Deep Code Reasoning server. Each tool includes JSON parameter structures, common use cases, and troubleshooting tips.

## Quick Start

All tools follow this basic parameter structure:

```json
{
  "analysisType": "execution_trace|cross_system|performance|hypothesis_test",
  "analysisContext": {
    "attemptedApproaches": ["approach1", "approach2"],
    "partialFindings": [{"description": "finding", "type": "category"}],
    "stuckPoints": ["point1", "point2"],
    "focusArea": {
      "files": ["/absolute/path/to/file.ts"],
      "entryPoints": ["functionName"],
      "serviceNames": ["serviceName"]
    }
  }
}
```

## Tool Reference

### 1. escalate_analysis

**Purpose**: Hand off complex analysis to Gemini when VS Code hits reasoning limits

**Parameters:**

```json
{
  "analysisContext": {
    "attemptedApproaches": [
      "manual code review",
      "basic static analysis",
      "grep pattern search"
    ],
    "partialFindings": [
      {
        "description": "Complex multi-service architecture with 13 MCP tools",
        "type": "architecture"
      },
      {
        "description": "Memory management protocol implemented",
        "type": "infrastructure"
      }
    ],
    "stuckPoints": [
      "Understanding optimal performance patterns",
      "Identifying potential security vulnerabilities"
    ],
    "focusArea": {
      "files": [
        "/home/lucas_galdino/repositories/mcp_servers/mcp-server-deep-code-reasoning-mcp/src/index.ts",
        "/home/lucas_galdino/repositories/mcp_servers/mcp-server-deep-code-reasoning-mcp/src/services/GeminiService.ts"
      ]
    }
  },
  "analysisType": "execution_trace",
  "depthLevel": 3,
  "timeBudgetSeconds": 60
}
```

### 2. trace_execution_path

**Purpose**: Use Gemini to perform deep execution analysis with semantic understanding

**Parameters:**

```json
{
  "entryPoint": {
    "file": "/home/lucas_galdino/repositories/mcp_servers/mcp-server-deep-code-reasoning-mcp/src/analyzers/DeepCodeReasonerV2.ts",
    "functionName": "escalateFromClaudeCode",
    "line": 45
  },
  "maxDepth": 10,
  "includeDataFlow": true
}
```

### 3. cross_system_impact

**Purpose**: Analyze changes across service boundaries using Gemini

**Parameters:**

```json
{
  "changeScope": {
    "files": [
      "/home/lucas_galdino/repositories/mcp_servers/mcp-server-deep-code-reasoning-mcp/src/services/GeminiService.ts",
      "/home/lucas_galdino/repositories/mcp_servers/mcp-server-deep-code-reasoning-mcp/src/services/ConversationManager.ts"
    ],
    "serviceNames": ["GeminiService", "ConversationManager", "HealthChecker"]
  },
  "impactTypes": ["breaking", "performance", "behavioral"]
}
```

### 4. performance_bottleneck

**Purpose**: Use Gemini for deep performance analysis with execution modeling

**Parameters:**

```json
{
  "codePath": {
    "entryPoint": {
      "file": "/home/lucas_galdino/repositories/mcp_servers/mcp-server-deep-code-reasoning-mcp/src/services/GeminiService.ts",
      "functionName": "generateResponse",
      "line": 120
    },
    "suspectedIssues": [
      "API rate limiting causing delays",
      "Large context windows impacting response time",
      "Memory usage during conversation management"
    ]
  },
  "profileDepth": 3
}
```

### 5. hypothesis_test

**Purpose**: Use Gemini to test specific theories about code behavior

**Parameters:**

```json
{
  "hypothesis": "Memory leaks occur when conversation sessions are not properly cleaned up after timeout",
  "codeScope": {
    "files": [
      "/home/lucas_galdino/repositories/mcp_servers/mcp-server-deep-code-reasoning-mcp/src/services/ConversationManager.ts",
      "/home/lucas_galdino/repositories/mcp_servers/mcp-server-deep-code-reasoning-mcp/src/utils/MemoryManagementProtocol.ts"
    ],
    "entryPoints": ["cleanupExpiredSessions", "checkpointMemory"]
  },
  "testApproach": "Analyze session lifecycle and memory cleanup patterns to identify potential leak sources"
}
```

### 6. start_conversation

**Purpose**: Start a conversational analysis session between Claude and Gemini

**Parameters:**

```json
{
  "analysisContext": {
    "attemptedApproaches": [
      "Static code analysis",
      "Manual performance profiling"
    ],
    "partialFindings": [
      {
        "description": "High memory usage during batch operations",
        "type": "performance"
      }
    ],
    "stuckPoints": [
      "Unable to identify root cause of memory spikes"
    ],
    "focusArea": {
      "files": [
        "/home/lucas_galdino/repositories/mcp_servers/mcp-server-deep-code-reasoning-mcp/src/services/HypothesisTournamentService.ts"
      ]
    }
  },
  "analysisType": "performance",
  "initialQuestion": "What are the memory allocation patterns in the hypothesis tournament system that could cause performance degradation?"
}
```

### 7. continue_conversation

**Purpose**: Continue an ongoing analysis conversation

**Parameters:**

```json
{
  "sessionId": "conv_12345",
  "message": "Based on your analysis, can you examine the batch processing logic in more detail?",
  "includeCodeSnippets": true
}
```

### 8. finalize_conversation

**Purpose**: Complete the conversation and get final analysis results

**Parameters:**

```json
{
  "sessionId": "conv_12345",
  "summaryFormat": "actionable"
}
```

### 9. get_conversation_status

**Purpose**: Check the status and progress of an ongoing conversation

**Parameters:**

```json
{
  "sessionId": "conv_12345"
}
```

### 10. run_hypothesis_tournament

**Purpose**: Run a competitive hypothesis tournament to find root causes

**Parameters:**

```json
{
  "analysisContext": {
    "attemptedApproaches": [
      "Memory profiling",
      "Performance benchmarking",
      "Static analysis"
    ],
    "partialFindings": [
      {
        "description": "Memory usage spikes during concurrent analysis requests",
        "type": "performance"
      }
    ],
    "stuckPoints": [
      "Cannot determine if issue is in Gemini service, conversation management, or memory protocol"
    ],
    "focusArea": {
      "files": [
        "/home/lucas_galdino/repositories/mcp_servers/mcp-server-deep-code-reasoning-mcp/src/services/GeminiService.ts",
        "/home/lucas_galdino/repositories/mcp_servers/mcp-server-deep-code-reasoning-mcp/src/services/ConversationManager.ts",
        "/home/lucas_galdino/repositories/mcp_servers/mcp-server-deep-code-reasoning-mcp/src/utils/MemoryManagementProtocol.ts"
      ]
    }
  },
  "issue": "High memory usage and performance degradation during concurrent analysis operations",
  "tournamentConfig": {
    "maxHypotheses": 6,
    "maxRounds": 3,
    "parallelSessions": 4
  }
}
```

### 11. health_check

**Purpose**: Execute a specific health check or all health checks

**Parameters:**

```json
{
  "check_name": "memory"
}
```

**Available check names:**

- `memory` - Memory usage validation
- `startup` - System startup health
- `dependencies` - External dependencies check
- `performance` - Performance metrics check

### 12. health_summary

**Purpose**: Get comprehensive health status of the MCP server

**Parameters:**

```json
{
  "include_details": true
}
```

---

## Common Error Patterns & Solutions

### ❌ **Error: "Invalid parameters"**

**Cause**: Missing required fields or incorrect parameter structure

**Solution**: Ensure your JSON includes:

- `analysisContext` (not `claudeContext`)
- `focusArea.files` with absolute paths
- All required fields for the specific tool

### ❌ **Error: "File path validation failed"**

**Cause**: Relative paths or non-existent files

**Solution**: Use absolute paths starting with `/home/` or full workspace path

### ❌ **Error: "Analysis type not recognized"**

**Cause**: Invalid `analysisType` value

**Solution**: Use only: `execution_trace`, `cross_system`, `performance`, or `hypothesis_test`

### ❌ **Error: "Gemini API quota exceeded"**

**Cause**: Free tier quota limits reached

**Solution**: Wait for quota reset or consider API key upgrade

---

## Quick Examples by Use Case

### 🔍 **Performance Investigation**

```json
{
  "analysisContext": {
    "attemptedApproaches": ["profiling", "benchmarking"],
    "partialFindings": [{"description": "Slow response times", "type": "performance"}],
    "stuckPoints": ["Cannot identify bottleneck source"],
    "focusArea": {
      "files": ["/path/to/slow/service.ts"]
    }
  },
  "analysisType": "performance"
}
```

### 🐛 **Bug Investigation**

```json
{
  "analysisContext": {
    "attemptedApproaches": ["debugging", "log analysis"],
    "partialFindings": [{"description": "Intermittent failures", "type": "reliability"}],
    "stuckPoints": ["Cannot reproduce consistently"],
    "focusArea": {
      "files": ["/path/to/buggy/component.ts"]
    }
  },
  "analysisType": "execution_trace"
}
```

### 🏗️ **Architecture Analysis**

```json
{
  "analysisContext": {
    "attemptedApproaches": ["code review", "documentation review"],
    "partialFindings": [{"description": "Complex interdependencies", "type": "architecture"}],
    "stuckPoints": ["Impact of proposed changes unclear"],
    "focusArea": {
      "files": ["/path/to/core/service.ts"],
      "serviceNames": ["ServiceA", "ServiceB"]
    }
  },
  "analysisType": "cross_system"
}
```

---

## Parameter Name Changes (2025-09-11)

**IMPORTANT**: The parameter `claudeContext` has been renamed to `analysisContext` for better clarity.

**Old (deprecated)**:

```json
{
  "claudeContext": { ... }
}
```

**New (current)**:

```json
{
  "analysisContext": { ... }
}
```

---

## Support & Troubleshooting

### 📞 **Getting Help**

1. Check this guide for parameter examples
2. Verify file paths are absolute
3. Ensure all required fields are included
4. Check recent error logs for specific issues

### 🔧 **Common Fixes**

- **Invalid JSON**: Use a JSON validator before sending
- **Missing files**: Verify paths exist in your workspace
- **API errors**: Check health_summary for quota status
- **Performance issues**: Use smaller file sets for initial testing

### 📈 **Best Practices**

- Start with single files, expand gradually
- Use descriptive `stuckPoints` and `partialFindings`
- Include relevant `attemptedApproaches` for context
- Test with health_check before complex analysis

---

*Last updated: September 11, 2025*
*Version: 1.0 - Initial comprehensive guide*
