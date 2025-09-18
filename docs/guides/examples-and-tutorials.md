- [Examples and Tutorials](#examples-and-tutorials)
  - [Overview](#overview)
  - [Quick Start Examples](#quick-start-examples)
    - [Example 1: Simple Performance Analysis](#example-1-simple-performance-analysis)
    - [Example 2: Cross-System Debugging](#example-2-cross-system-debugging)
  - [Detailed Tutorials](#detailed-tutorials)
    - [Tutorial 1: Multi-Turn Conversation Analysis](#tutorial-1-multi-turn-conversation-analysis)
      - [Scenario Setup](#scenario-setup)
      - [Step 1: Start the Conversation](#step-1-start-the-conversation)
      - [Step 2: Continue with Additional Context](#step-2-continue-with-additional-context)
      - [Step 3: Finalize with Action Plan](#step-3-finalize-with-action-plan)
    - [Tutorial 2: Hypothesis Tournament for Bug Investigation](#tutorial-2-hypothesis-tournament-for-bug-investigation)
      - [Scenario](#scenario)
      - [Step 1: Define Competing Hypotheses](#step-1-define-competing-hypotheses)
      - [Step 2: Analyze Results](#step-2-analyze-results)
      - [Step 3: Implement the Fix](#step-3-implement-the-fix)
    - [Tutorial 3: Performance Optimization Workflow](#tutorial-3-performance-optimization-workflow)
      - [Step 1: Initial Performance Analysis](#step-1-initial-performance-analysis)
      - [Step 2: Trace Execution Path](#step-2-trace-execution-path)
      - [Step 3: Cross-System Impact Analysis](#step-3-cross-system-impact-analysis)
  - [Advanced Use Cases](#advanced-use-cases)
    - [Use Case 1: Distributed System Correlation](#use-case-1-distributed-system-correlation)
    - [Use Case 2: Security Vulnerability Assessment](#use-case-2-security-vulnerability-assessment)
  - [Best Practices from Examples](#best-practices-from-examples)
    - [1. Context Preparation](#1-context-preparation)
    - [2. Progressive Analysis Depth](#2-progressive-analysis-depth)
    - [3. Tool Selection Strategy](#3-tool-selection-strategy)
    - [4. Response Processing](#4-response-processing)

# Examples and Tutorials

## Overview

This document provides practical examples and step-by-step tutorials for using the Deep Code Reasoning MCP Server effectively in real-world scenarios.

## Quick Start Examples

### Example 1: Simple Performance Analysis

**Scenario**: Your API endpoint response time suddenly increased from 100ms to 2000ms.

**Step 1: Initial Analysis with Claude Code**

```bash
# Claude Code investigation
curl -X GET /api/users/profile -w "@curl-format.txt"
# Response time: 2.1s (expected: 0.1s)

# Check recent deployments
git log --oneline --since="2 days ago"
# Review database connection pool settings
# Check server resources (CPU/memory normal)
```

**Step 2: Escalate to MCP Server**

```json
{
  "name": "performance_bottleneck",
  "arguments": {
    "code_path": {
      "entry_point": {
        "file": "src/api/UserController.ts",
        "line": 45,
        "function_name": "getUserProfile"
      },
      "suspected_issues": ["database queries", "connection pooling"]
    },
    "profile_depth": 3,
    "include_memory_analysis": true
  }
}
```

**Step 3: Implementation**
Based on the MCP analysis results:

```typescript
// Before: N+1 query pattern
async getUserProfile(userId: string) {
  const user = await User.findById(userId);
  const profile = await Profile.findByUserId(userId); // N+1 problem
  return { user, profile };
}

// After: Optimized query
async getUserProfile(userId: string) {
  const userWithProfile = await User.findById(userId)
    .populate('profile'); // Single query with join
  return userWithProfile;
}
```

### Example 2: Cross-System Debugging

**Scenario**: Intermittent failures in a microservices architecture affecting order processing.

**Claude Code Investigation**:

```bash
# Check individual service logs
kubectl logs order-service-xyz
kubectl logs payment-service-abc
kubectl logs inventory-service-def

# Found: Sporadic timeout errors between services
# Partial findings: 15% of orders fail during peak hours
```

**MCP Server Analysis**:

```json
{
  "name": "start_conversation",
  "arguments": {
    "claude_context": {
      "attempted_approaches": [
        "Checked individual service logs",
        "Monitored database connections",
        "Reviewed network latency metrics"
      ],
      "partial_findings": [
        {
          "type": "timeout_pattern",
          "services": ["order-service", "payment-service"],
          "frequency": "15% during peak hours"
        }
      ],
      "stuck_description": "Intermittent cross-service timeouts, pattern unclear",
      "code_scope": {
        "files": [
          "services/order/src/OrderService.ts",
          "services/payment/src/PaymentService.ts",
          "shared/src/ServiceClient.ts"
        ],
        "service_names": ["order-service", "payment-service", "inventory-service"]
      }
    },
    "analysis_focus": "debugging",
    "depth_level": 4
  }
}
```

## Detailed Tutorials

### Tutorial 1: Multi-Turn Conversation Analysis

This tutorial demonstrates how to use the conversational tools for complex debugging scenarios.

#### Scenario Setup

You're investigating a memory leak in a Node.js application that only occurs in production during high-traffic periods.

#### Step 1: Start the Conversation

```json
{
  "name": "start_conversation", 
  "arguments": {
    "attempted_approaches": [
      "Local memory profiling with --inspect",
      "Heap dump analysis with Chrome DevTools", 
      "Production memory monitoring for 2 weeks",
      "Code review of recent changes"
    ],
    "partial_findings": [
      {
        "type": "memory_pattern",
        "description": "Memory grows 50MB/hour during peak traffic",
        "location": "suspected in request handling layer"
      },
      {
        "type": "timing_correlation", 
        "description": "Memory spikes correlate with specific API endpoints"
      }
    ],
    "stuck_description": [
      "Memory leak occurs only in production under load, difficult to reproduce locally",
      "Heap dumps show retained objects but root cause unclear",
      "Cannot isolate which component is causing the leak"
    ],
    "code_scope": {
      "files": [
        "src/api/RequestHandler.ts",
        "src/middleware/AuthMiddleware.ts", 
        "src/cache/RedisCache.ts",
        "src/database/ConnectionPool.ts"
      ],
      "entryPoints": [
        {
          "file": "src/api/RequestHandler.ts",
          "line": 25,
          "functionName": "handleRequest"
        }
      ]
    },
    "analysisType": "performance",
    "initialQuestion": "Can you help identify the root cause of this production memory leak pattern?"
  }
}
```

**Expected Response**:

```json
{
  "session_id": "conv_12345",
  "gemini_response": "I can see a classic production memory leak pattern. Based on your heap dumps and the correlation with specific endpoints, I suspect we're dealing with event listener accumulation or cached object retention. Let me analyze the request lifecycle...\n\nI notice in RequestHandler.ts that you're registering event listeners. Are these being properly cleaned up? Also, the RedisCache integration might be retaining references longer than expected.\n\nCan you share the specific heap dump analysis showing which object types are growing? And do you have metrics on which API endpoints correlate most strongly with the memory growth?",
  "next_steps": [
    "Share heap dump object type analysis",
    "Identify high-correlation API endpoints", 
    "Review event listener cleanup patterns",
    "Examine RedisCache retention policies"
  ],
  "estimated_turns": 6
}
```

#### Step 2: Continue with Additional Context

```json
{
  "name": "continue_conversation",
  "arguments": {
    "session_id": "conv_12345",
    "message": "Here's the heap dump analysis:\n\n**Growing Object Types:**\n- EventEmitter instances: +2,000 every hour\n- Promise objects: +5,000 every hour  \n- Buffer objects: +1,500 every hour\n\n**High-correlation endpoints:**\n- /api/users/search (45% of memory growth)\n- /api/notifications/send (30% of memory growth)\n- /api/files/upload (25% of memory growth)\n\nI found that we're adding event listeners in the search endpoint for real-time updates but might not be removing them properly.",
    "include_code_snippets": true,
    "attach_files": [
      "logs/heap-dump-analysis.txt",
      "src/api/endpoints/SearchEndpoint.ts"
    ]
  }
}
```

**Expected Response**:

```json
{
  "session_id": "conv_12345",
  "gemini_response": "Perfect! This confirms my suspicion. The EventEmitter accumulation is a classic sign of listener leaks. Looking at your SearchEndpoint.ts, I can see the issue:\n\n```typescript\n// Problem: Adding listeners without cleanup\nconst searchEmitter = new EventEmitter();\nsearchEmitter.on('result', handleResult);\n// Missing: searchEmitter.removeAllListeners()\n```\n\nThe Promise accumulation suggests we also have dangling promises that aren't being properly resolved or rejected. This often happens with timeout logic.\n\nFor the Buffer objects, the file upload endpoint is likely not releasing file buffers after processing.\n\nShould I trace through the complete lifecycle of these three endpoints to identify all the retention points?",
  "conversation_status": "active",
  "suggested_action": "trace_endpoint_lifecycles"
}
```

#### Step 3: Finalize with Action Plan

```json
{
  "name": "finalize_conversation",
  "arguments": {
    "session_id": "conv_12345",
    "summary_format": "actionable"
  }
}
```

**Expected Response**:

```json
{
  "session_id": "conv_12345",
  "conversation_summary": {
    "problem_identified": "Production memory leak caused by accumulated EventEmitter listeners, unresolved Promises, and retained Buffer objects in three API endpoints",
    "root_causes": [
      "Event listeners not cleaned up in search endpoint real-time feature",
      "Promise timeout handlers creating dangling promises", 
      "File upload buffers not explicitly released after processing"
    ],
    "solutions_discussed": [
      {
        "description": "Implement proper event listener cleanup with removeAllListeners()",
        "feasibility": "high",
        "effort_estimate": "2 hours"
      },
      {
        "description": "Add Promise.race() with timeout and proper rejection handling",
        "feasibility": "high", 
        "effort_estimate": "4 hours"
      },
      {
        "description": "Explicit buffer cleanup with null assignment after upload processing",
        "feasibility": "high",
        "effort_estimate": "1 hour"
      }
    ],
    "recommended_action": {
      "priority": "high",
      "steps": [
        "Fix event listener cleanup in SearchEndpoint.ts (lines 45-67)",
        "Implement Promise timeout wrapper utility function",
        "Add explicit buffer cleanup in FileUploadEndpoint.ts",
        "Add memory usage monitoring to production alerts",
        "Deploy fix during low-traffic window",
        "Monitor memory growth for 48 hours post-deployment"
      ],
      "estimated_effort": "7 hours development + 2 hours testing",
      "risks": [
        "Search real-time features might lose some responsiveness",
        "Need to verify timeout values don't break legitimate long-running operations"
      ]
    },
    "conversation_turns": 4,
    "analysis_duration": "12 minutes"
  },
  "artifacts": {
    "code_snippets": [
      "SearchEndpoint.ts lines 45-67 (event listener pattern)",
      "RequestHandler.ts Promise timeout logic", 
      "FileUploadEndpoint.ts buffer handling"
    ],
    "logs_analyzed": [
      "heap-dump-analysis.txt",
      "production-memory-metrics.log"
    ],
    "metrics_collected": [
      "EventEmitter growth rate: 2000/hour",
      "Promise retention: 5000/hour",
      "Buffer accumulation: 1500/hour"
    ]
  }
}
```

### Tutorial 2: Hypothesis Tournament for Bug Investigation

This tutorial shows how to systematically test multiple theories about a bug using the hypothesis tournament feature.

#### Scenario

Users report that the mobile app crashes intermittently when uploading photos, but the issue can't be reproduced consistently.

#### Step 1: Define Competing Hypotheses

```json
{
  "name": "run_hypothesis_tournament",
  "arguments": {
    "attempted_approaches": [
      "Crash report analysis for 100+ incidents",
      "Memory profiling on test devices",
      "Network latency testing in various conditions",
      "Server log correlation with crash timestamps"
    ],
    "partial_findings": [
      {
        "type": "crash_pattern",
        "description": "Crashes increase 300% with photos larger than 5MB",
        "confidence": 0.8
      },
      {
        "type": "timing_correlation",
        "description": "80% of crashes occur during peak network usage hours",
        "confidence": 0.7
      }
    ],
    "stuck_description": [
      "Cannot reproduce crashes consistently in development environment",
      "Multiple potential root causes with overlapping symptoms",
      "Need systematic testing of competing theories"
    ],
    "code_scope": {
      "files": [
        "mobile/src/components/PhotoUpload.tsx",
        "mobile/src/services/UploadService.ts",
        "mobile/src/utils/ImageProcessor.ts",
        "server/src/api/upload.ts",
        "server/src/middleware/validation.ts"
      ],
      "serviceNames": [
        "PhotoUploadService",
        "ImageProcessingService", 
        "FileUploadAPI"
      ]
    },
    "issue": "Mobile app crashes intermittently during photo uploads, affecting 15% of users with unclear root cause",
    "tournamentConfig": {
      "maxHypotheses": 5,
      "maxRounds": 3,
      "parallelSessions": 3
    }
  }
}
```

#### Step 2: Analyze Results

**Expected Response**:

```json
{
  "tournament_id": "tournament_789",
  "results": [
    {
      "hypothesis_id": "image_processing",
      "likelihood_score": 87,
      "evidence": [
        "Memory spikes in crash reports correlate with ImageProcessor.resize() calls",
        "iOS crash logs show EXC_BAD_ACCESS in image manipulation code",
        "Android OutOfMemoryError specifically in bitmap processing",
        "Large images (>5MB) have 94% crash rate vs 12% for smaller images"
      ],
      "counter_evidence": [
        "Some crashes occur before image processing begins",
        "Memory limits alone don't explain all crash patterns"
      ],
      "test_duration": 42
    },
    {
      "hypothesis_id": "memory_limit",
      "likelihood_score": 73,
      "evidence": [
        "Crash reports show memory warnings before crashes",
        "Larger devices have lower crash rates",
        "Crash frequency correlates with device RAM amount"
      ],
      "counter_evidence": [
        "Some crashes occur on high-memory devices",
        "Memory usage patterns don't fully explain timing"
      ],
      "test_duration": 38
    },
    {
      "hypothesis_id": "concurrent_uploads",
      "likelihood_score": 45,
      "evidence": [
        "Race condition found in upload queue management",
        "Some crashes occur when multiple uploads attempted"
      ],
      "counter_evidence": [
        "Most crashes happen with single uploads",
        "Race condition affects <20% of cases"
      ],
      "test_duration": 41
    },
    {
      "hypothesis_id": "network_timeout",
      "likelihood_score": 28,
      "evidence": [
        "Slow networks correlate with crash reports",
        "Timeout handling logic has potential issues"
      ],
      "counter_evidence": [
        "Crashes happen on fast WiFi networks too",
        "Network timeouts usually don't cause crashes, just errors"
      ],
      "test_duration": 35
    },
    {
      "hypothesis_id": "server_rejection",
      "likelihood_score": 15,
      "evidence": [
        "Some server validation errors not handled gracefully"
      ],
      "counter_evidence": [
        "Server errors logged separately from crash events",
        "Error handling code appears robust",
        "Crashes happen before server responses in most cases"
      ],
      "test_duration": 33
    }
  ],
  "winner": {
    "hypothesis_id": "image_processing",
    "confidence": 87,
    "recommendation": "Focus on ImageProcessor.resize() memory management. Implement streaming image processing and add memory pressure handling before processing large images."
  },
  "execution_time": 156
}
```

#### Step 3: Implement the Fix

Based on the tournament results:

```typescript
// Before: Memory-intensive image processing
class ImageProcessor {
  async resize(imageBuffer: Buffer, maxWidth: number): Promise<Buffer> {
    // Problem: Loads entire image into memory at once
    const image = await sharp(imageBuffer);
    return await image.resize(maxWidth).jpeg().toBuffer();
  }
}

// After: Memory-safe streaming approach
class ImageProcessor {
  async resize(imageBuffer: Buffer, maxWidth: number): Promise<Buffer> {
    // Check available memory before processing
    const memoryUsage = process.memoryUsage();
    const imageSize = imageBuffer.length;
    
    if (memoryUsage.heapUsed + imageSize > this.getMemoryLimit()) {
      throw new Error('Insufficient memory for image processing');
    }
    
    // Stream processing for large images
    if (imageSize > 5 * 1024 * 1024) { // 5MB threshold
      return this.streamResize(imageBuffer, maxWidth);
    }
    
    // Standard processing for smaller images  
    const image = await sharp(imageBuffer);
    return await image.resize(maxWidth).jpeg().toBuffer();
  }
  
  private async streamResize(imageBuffer: Buffer, maxWidth: number): Promise<Buffer> {
    // Implement streaming resize for large images
    // Process in chunks to avoid memory spikes
    return sharp(imageBuffer)
      .resize(maxWidth)
      .jpeg({ progressive: true })
      .toBuffer();
  }
}
```

### Tutorial 3: Performance Optimization Workflow

This tutorial demonstrates a complete performance optimization workflow using multiple MCP tools.

#### Step 1: Initial Performance Analysis

```json
{
  "name": "performance_bottleneck",
  "arguments": {
    "code_path": {
      "entry_point": {
        "file": "src/api/SearchController.ts",
        "line": 34,
        "function_name": "searchProducts"
      },
      "suspected_issues": [
        "Database query performance",
        "Search algorithm efficiency",
        "Result serialization overhead"
      ]
    },
    "profile_depth": 4,
    "include_memory_analysis": true
  }
}
```

#### Step 2: Trace Execution Path

```json
{
  "name": "trace_execution_path", 
  "arguments": {
    "entry_point": {
      "file": "src/api/SearchController.ts",
      "line": 34,
      "function_name": "searchProducts"
    },
    "max_depth": 12,
    "include_data_flow": true,
    "focus_areas": ["performance", "data_flow"]
  }
}
```

#### Step 3: Cross-System Impact Analysis

```json
{
  "name": "cross_system_impact",
  "arguments": {
    "change_scope": {
      "files": [
        "src/api/SearchController.ts",
        "src/database/SearchQueries.ts", 
        "src/search/SearchEngine.ts"
      ],
      "service_names": [
        "search-service",
        "product-service", 
        "elasticsearch"
      ]
    },
    "impact_types": ["performance", "behavioral"],
    "analysis_depth": 3
  }
}
```

## Advanced Use Cases

### Use Case 1: Distributed System Correlation

**Scenario**: Investigating a cascade failure across microservices.

```json
{
  "name": "start_conversation",
  "arguments": {
    "claude_context": {
      "attempted_approaches": [
        "Individual service log analysis", 
        "Database connection monitoring",
        "Load balancer health checks",
        "Circuit breaker status review"
      ],
      "partial_findings": [
        {
          "type": "cascade_pattern",
          "description": "Failures start in payment service, spread to order and notification services",
          "timeline": "Initial failure at 14:23, full cascade by 14:31"
        }
      ],
      "stuck_description": "Can see the cascade pattern but can't identify the root trigger. Need to correlate events across 8 services with different logging formats.",
      "code_scope": {
        "service_names": [
          "payment-service", "order-service", "notification-service",
          "user-service", "inventory-service", "shipping-service", 
          "analytics-service", "email-service"
        ]
      }
    },
    "analysis_focus": "debugging",
    "depth_level": 5
  }
}
```

### Use Case 2: Security Vulnerability Assessment

**Scenario**: Investigating potential security issues after a penetration test report.

```json
{
  "name": "hypothesis_test",
  "arguments": {
    "hypothesis": {
      "description": "SQL injection vulnerability exists in user search functionality due to dynamic query construction",
      "type": "security",
      "confidence_level": 3
    },
    "test_scope": {
      "files": [
        "src/api/UserController.ts",
        "src/database/UserQueries.ts",
        "src/middleware/InputValidation.ts"
      ],
      "test_data": {
        "sample_inputs": [
          "'; DROP TABLE users; --",
          "admin' OR '1'='1",
          "UNION SELECT * FROM sensitive_data"
        ]
      }
    },
    "validation_method": "static_analysis"
  }
}
```

## Best Practices from Examples

### 1. Context Preparation

**✅ Good Context**:

```json
{
  "attempted_approaches": [
    "Specific action: Checked database connection pool settings in config/database.ts",
    "Specific action: Profiled API response times using artillery load test",
    "Specific action: Analyzed heap dumps from production server"
  ],
  "partial_findings": [
    {
      "type": "performance_metric",
      "value": "Response time increased from 100ms to 2000ms",
      "location": "src/api/UserController.ts:45",
      "timestamp": "2024-03-07T14:30:00Z"
    }
  ]
}
```

**❌ Poor Context**:

```json
{
  "attempted_approaches": ["debugging", "testing"],
  "partial_findings": ["something slow"],
  "stuck_description": "app broken"
}
```

### 2. Progressive Analysis Depth

Start shallow and deepen as needed:

```json
// Start with depth 2-3
{"depth_level": 2}

// If insufficient, try depth 4  
{"depth_level": 4}

// Only use depth 5 for very complex cases
{"depth_level": 5}
```

### 3. Tool Selection Strategy

1. **Single issue**: Use `escalate_analysis` or specific tools
2. **Multiple theories**: Use `run_hypothesis_tournament`
3. **Complex debugging**: Use `start_conversation`
4. **Performance issues**: Use `performance_bottleneck` → `trace_execution_path`
5. **Impact assessment**: Use `cross_system_impact`

### 4. Response Processing

Always validate and act on MCP responses:

```typescript
// Process structured responses
interface MCPResponse {
  analysis_id: string;
  findings: {
    root_cause: string;
    confidence_level: number;
  };
  recommendations: string[];
}

function processAnalysis(response: MCPResponse) {
  if (response.findings.confidence_level >= 4) {
    // High confidence: implement recommendations
    implementRecommendations(response.recommendations);
  } else {
    // Lower confidence: gather more data
    requestAdditionalAnalysis(response.analysis_id);
  }
}
```

This comprehensive examples and tutorials document provides practical guidance for effectively leveraging the Deep Code Reasoning MCP Server's capabilities in real-world development scenarios.
