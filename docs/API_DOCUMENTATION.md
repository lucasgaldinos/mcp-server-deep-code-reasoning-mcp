---
title: Deep Code Reasoning MCP Server - API Documentation
description: Complete API reference for all MCP tools and endpoints
status: published
updated: 2025-09-08
tags: [api, documentation, mcp, tools, reference]
---

# Deep Code Reasoning MCP Server - API Documentation

- [Deep Code Reasoning MCP Server - API Documentation](#deep-code-reasoning-mcp-server---api-documentation)
  - [Overview](#overview)
  - [Quick Start](#quick-start)
    - [Prerequisites](#prerequisites)
    - [Basic Usage](#basic-usage)
  - [Available Tools](#available-tools)
    - [1. start\_conversation](#1-start_conversation)
    - [2. continue\_conversation](#2-continue_conversation)
    - [3. finalize\_conversation](#3-finalize_conversation)
    - [4. performance\_bottleneck](#4-performance_bottleneck)
    - [5. trace\_execution\_path](#5-trace_execution_path)
    - [6. hypothesis\_test](#6-hypothesis_test)
    - [7. run\_hypothesis\_tournament](#7-run_hypothesis_tournament)
    - [8. escalate\_from\_claude\_code](#8-escalate_from_claude_code)
    - [9. check\_conversation\_status](#9-check_conversation_status)
    - [10. health\_check](#10-health_check)
    - [11. health\_summary](#11-health_summary)
    - [12. deep\_analysis](#12-deep_analysis)
    - [13. quick\_analysis](#13-quick_analysis)
  - [Error Handling](#error-handling)
    - [Standard Error Response](#standard-error-response)
    - [Common Error Codes](#common-error-codes)
  - [Authentication](#authentication)
    - [API Key Configuration](#api-key-configuration)
    - [Security Considerations](#security-considerations)
  - [Rate Limits](#rate-limits)
  - [Performance Considerations](#performance-considerations)
    - [Context Budget Guidelines](#context-budget-guidelines)
    - [File Size Limits](#file-size-limits)
  - [Examples](#examples)
    - [Complete Performance Analysis Workflow](#complete-performance-analysis-workflow)
    - [Hypothesis Testing Workflow](#hypothesis-testing-workflow)
  - [Support](#support)
    - [Health Monitoring](#health-monitoring)
    - [Troubleshooting](#troubleshooting)
  - [Changelog](#changelog)

## Overview

The Deep Code Reasoning MCP Server provides 13 specialized analysis tools through the Model Context Protocol (MCP). This document provides comprehensive API documentation for all available tools and endpoints.

## Quick Start

### Prerequisites

- Node.js 18+ with ES modules support
- Google Gemini API key
- TypeScript/JavaScript environment with MCP support

### Basic Usage

```bash
# Install dependencies
npm install

# Set environment variables
export GEMINI_API_KEY=your_api_key_here

# Start the server
npm start
```

## Available Tools

### 1. start_conversation

**Purpose**: Initiates a new conversational analysis session with Gemini.

**Parameters**:

```json
{
  "initialPrompt": "string",      // Required: Initial analysis prompt
  "contextBudget": "number",      // Optional: Analysis time budget in seconds (default: 60)
  "analysisType": "string"        // Optional: Type of analysis (default: "general")
}
```

**Example**:

```json
{
  "initialPrompt": "Analyze the performance bottlenecks in this Express.js application",
  "contextBudget": 120,
  "analysisType": "performance"
}
```

**Response**:

```json
{
  "conversationId": "uuid-string",
  "response": "Initial analysis response",
  "status": "started",
  "metadata": {
    "tokensUsed": 1234,
    "analysisType": "performance",
    "timestamp": "2025-09-08T12:00:00Z"
  }
}
```

### 2. continue_conversation

**Purpose**: Continues an existing conversational analysis session.

**Parameters**:

```json
{
  "conversationId": "string",     // Required: Existing conversation ID
  "message": "string",            // Required: Follow-up message or question
  "contextBudget": "number"       // Optional: Additional time budget in seconds
}
```

**Example**:

```json
{
  "conversationId": "abc-123-def",
  "message": "Can you provide specific optimization recommendations?",
  "contextBudget": 60
}
```

### 3. finalize_conversation

**Purpose**: Finalizes a conversation and generates a comprehensive summary.

**Parameters**:

```json
{
  "conversationId": "string",     // Required: Conversation ID to finalize
  "summaryType": "string"         // Optional: Type of summary (default: "comprehensive")
}
```

### 4. performance_bottleneck

**Purpose**: Conducts deep performance analysis to identify bottlenecks.

**Parameters**:

```json
{
  "filePaths": ["string"],        // Required: Array of file paths to analyze
  "analysisDepth": "string",      // Optional: "shallow" | "deep" (default: "deep")
  "contextBudget": "number",      // Optional: Time budget in seconds
  "includeCallStack": "boolean"   // Optional: Include call stack analysis (default: true)
}
```

**Example**:

```json
{
  "filePaths": ["src/server.js", "src/database.js"],
  "analysisDepth": "deep",
  "contextBudget": 180,
  "includeCallStack": true
}
```

**Response**:

```json
{
  "bottlenecks": [
    {
      "file": "src/database.js",
      "line": 45,
      "type": "database_query",
      "severity": "high",
      "description": "N+1 query pattern detected",
      "recommendation": "Implement batch loading or join queries"
    }
  ],
  "performanceScore": 65,
  "optimizationPotential": 40,
  "summary": "Detailed performance analysis summary"
}
```

### 5. trace_execution_path

**Purpose**: Traces execution paths to understand code flow and dependencies.

**Parameters**:

```json
{
  "filePaths": ["string"],        // Required: Files to trace
  "entryPoint": "string",         // Optional: Starting function/method
  "maxDepth": "number",           // Optional: Maximum trace depth (default: 10)
  "includeDependencies": "boolean" // Optional: Include external dependencies (default: false)
}
```

### 6. hypothesis_test

**Purpose**: Tests specific hypotheses about code behavior or issues.

**Parameters**:

```json
{
  "hypothesis": "string",         // Required: Hypothesis to test
  "filePaths": ["string"],        // Required: Relevant files
  "testScenarios": ["string"],    // Optional: Specific scenarios to test
  "contextBudget": "number"       // Optional: Time budget for testing
}
```

**Example**:

```json
{
  "hypothesis": "Memory leaks are caused by unclosed database connections",
  "filePaths": ["src/database.js", "src/connection-pool.js"],
  "testScenarios": ["connection_lifecycle", "error_handling"],
  "contextBudget": 120
}
```

### 7. run_hypothesis_tournament

**Purpose**: Runs multiple hypotheses in parallel to identify the most likely cause.

**Parameters**:

```json
{
  "hypotheses": ["string"],       // Required: Array of hypotheses to test
  "filePaths": ["string"],        // Required: Relevant files
  "tournamentType": "string",     // Optional: "parallel" | "sequential" (default: "parallel")
  "contextBudget": "number"       // Optional: Total time budget
}
```

### 8. escalate_from_claude_code

**Purpose**: Escalates complex analysis from Claude Code to Gemini for deeper insights.

**Parameters**:

```json
{
  "claudeAnalysis": "string",     // Required: Previous Claude analysis
  "escalationReason": "string",   // Required: Reason for escalation
  "filePaths": ["string"],        // Required: Files to analyze
  "analysisType": "string",       // Optional: Type of analysis needed
  "contextBudget": "number"       // Optional: Time budget for Gemini analysis
}
```

### 9. check_conversation_status

**Purpose**: Checks the current status of an ongoing conversation.

**Parameters**:

```json
{
  "conversationId": "string"      // Required: Conversation ID to check
}
```

**Response**:

```json
{
  "conversationId": "abc-123-def",
  "status": "active",             // "active" | "paused" | "completed"
  "messageCount": 5,
  "totalTokens": 12345,
  "lastActivity": "2025-09-08T12:30:00Z",
  "analysisType": "performance"
}
```

### 10. health_check

**Purpose**: Performs comprehensive system health checks.

**Parameters**: None

**Response**:

```json
{
  "status": "healthy",
  "timestamp": "2025-09-08T12:00:00Z",
  "checks": {
    "memory": {
      "status": "healthy",
      "usage": "45%",
      "available": "2.1GB"
    },
    "gemini_api": {
      "status": "healthy",
      "responseTime": "120ms"
    },
    "dependencies": {
      "status": "healthy",
      "loadedModules": 156
    }
  },
  "uptime": "3h 45m 12s"
}
```

### 11. health_summary

**Purpose**: Provides a detailed health summary with historical data.

**Parameters**: None

**Response**:

```json
{
  "overallHealth": "excellent",
  "score": 95,
  "summary": "All systems operating normally",
  "metrics": {
    "performance": 92,
    "reliability": 98,
    "availability": 99.9
  },
  "recommendations": [
    "Consider implementing caching for frequently accessed data"
  ]
}
```

### 12. deep_analysis

**Purpose**: Performs comprehensive deep analysis using the full Gemini context.

**Parameters**:

```json
{
  "filePaths": ["string"],        // Required: Files to analyze
  "analysisType": "string",       // Required: Type of analysis
  "contextBudget": "number",      // Optional: Time budget
  "includeRecommendations": "boolean", // Optional: Include actionable recommendations
  "priorityLevel": "string"       // Optional: "low" | "medium" | "high" (default: "medium")
}
```

### 13. quick_analysis

**Purpose**: Provides fast, focused analysis for immediate insights.

**Parameters**:

```json
{
  "filePaths": ["string"],        // Required: Files to analyze
  "focusArea": "string",          // Required: Specific area to focus on
  "timeLimit": "number"           // Optional: Maximum analysis time in seconds (default: 30)
}
```

## Error Handling

### Standard Error Response

All tools return errors in a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "file": "optional-file-reference",
      "line": "optional-line-number",
      "context": "additional-context"
    },
    "timestamp": "2025-09-08T12:00:00Z",
    "correlationId": "uuid-for-tracking"
  }
}
```

### Common Error Codes

- `INVALID_INPUT`: Invalid parameters provided
- `FILE_NOT_FOUND`: Specified file does not exist
- `GEMINI_API_ERROR`: Error communicating with Gemini API
- `TIMEOUT`: Operation exceeded time budget
- `MEMORY_LIMIT`: Operation exceeded memory limits
- `CONVERSATION_NOT_FOUND`: Invalid conversation ID
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded

## Authentication

### API Key Configuration

Set the Gemini API key via environment variable:

```bash
export GEMINI_API_KEY=your_api_key_here
```

### Security Considerations

- API keys are validated on server startup
- All file paths are validated to prevent path traversal attacks
- Input sanitization is applied to all user inputs
- Rate limiting is applied to prevent abuse

## Rate Limits

- **Analysis Operations**: 10 requests per minute per client
- **Health Checks**: 60 requests per minute per client
- **Conversation Operations**: 30 requests per minute per client

## Performance Considerations

### Context Budget Guidelines

- **Quick Analysis**: 10-30 seconds
- **Standard Analysis**: 60-120 seconds
- **Deep Analysis**: 180-300 seconds
- **Comprehensive Analysis**: 300+ seconds

### File Size Limits

- **Maximum file size**: 10MB per file
- **Maximum total input**: 100MB per request
- **Supported file types**: `.js`, `.ts`, `.py`, `.java`, `.cpp`, `.c`, `.go`, `.rs`, `.rb`, `.php`

## Examples

### Complete Performance Analysis Workflow

```javascript
// 1. Start conversation
const conversation = await client.callTool('start_conversation', {
  initialPrompt: 'Analyze performance issues in my Node.js application',
  contextBudget: 180,
  analysisType: 'performance'
});

// 2. Perform bottleneck analysis
const bottlenecks = await client.callTool('performance_bottleneck', {
  filePaths: ['src/app.js', 'src/database.js'],
  analysisDepth: 'deep',
  contextBudget: 120
});

// 3. Continue conversation with findings
const followUp = await client.callTool('continue_conversation', {
  conversationId: conversation.conversationId,
  message: `Based on the bottlenecks found: ${JSON.stringify(bottlenecks.bottlenecks)}, what are the top 3 optimization priorities?`
});

// 4. Finalize with summary
const summary = await client.callTool('finalize_conversation', {
  conversationId: conversation.conversationId,
  summaryType: 'actionable'
});
```

### Hypothesis Testing Workflow

```javascript
// Test multiple hypotheses in parallel
const tournament = await client.callTool('run_hypothesis_tournament', {
  hypotheses: [
    'Database queries are the primary bottleneck',
    'Memory leaks in event listeners cause performance degradation',
    'Unoptimized algorithms in data processing slow down the system'
  ],
  filePaths: ['src/database.js', 'src/events.js', 'src/processor.js'],
  tournamentType: 'parallel',
  contextBudget: 240
});

console.log('Winning hypothesis:', tournament.winner);
console.log('Confidence score:', tournament.confidence);
```

## Support

### Health Monitoring

Use the health check tools to monitor system status:

```javascript
// Basic health check
const health = await client.callTool('health_check');

// Detailed health summary
const summary = await client.callTool('health_summary');
```

### Troubleshooting

1. **Check system health** using health check tools
2. **Verify API key** configuration
3. **Check file permissions** for analyzed files
4. **Monitor rate limits** and adjust request frequency
5. **Review error logs** for detailed error information

## Changelog

- **v1.4.0**: Added comprehensive testing infrastructure and quality assurance tools
- **v1.3.0**: Enhanced performance optimization and caching capabilities
- **v1.2.0**: Improved conversational analysis and state management
- **v1.1.0**: Added hypothesis testing and tournament capabilities
- **v1.0.0**: Initial release with core analysis tools

---

*Last Updated: September 8, 2025*  
*API Version: 1.4.0*  
*MCP Protocol Version: 1.0*
