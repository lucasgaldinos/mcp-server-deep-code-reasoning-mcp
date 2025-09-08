- [MCP Tools Reference Guide](#mcp-tools-reference-guide)
  - [Overview](#overview)
  - [Tool Categories](#tool-categories)
    - [🔄 Conversational Analysis Tools](#-conversational-analysis-tools)
    - [🔍 Traditional Analysis Tools](#-traditional-analysis-tools)
    - [💡 Hypothesis Testing Tools](#-hypothesis-testing-tools)
    - [🏥 Health Monitoring Tools](#-health-monitoring-tools)
  - [Conversational Analysis Tools](#conversational-analysis-tools)
    - [start\_conversation](#start_conversation)
    - [continue\_conversation](#continue_conversation)
    - [finalize\_conversation](#finalize_conversation)
    - [get\_conversation\_status](#get_conversation_status)
  - [Traditional Analysis Tools](#traditional-analysis-tools)
    - [escalate\_analysis](#escalate_analysis)
    - [trace\_execution\_path](#trace_execution_path)
    - [cross\_system\_impact](#cross_system_impact)
    - [performance\_bottleneck](#performance_bottleneck)
    - [hypothesis\_test](#hypothesis_test)
  - [Advanced Tools](#advanced-tools)
    - [run\_hypothesis\_tournament](#run_hypothesis_tournament)
  - [Health Monitoring Tools](#health-monitoring-tools)
    - [health\_check](#health_check)
    - [health\_summary](#health_summary)
  - [Best Practices](#best-practices)
    - [Tool Selection Guidelines](#tool-selection-guidelines)
    - [Parameter Optimization](#parameter-optimization)
    - [Error Handling](#error-handling)

# MCP Tools Reference Guide

## Overview

The Deep Code Reasoning MCP Server provides 13 specialized tools for advanced code analysis. These tools are designed to complement Claude Code's capabilities by leveraging Gemini's massive context window and code execution abilities.

## Tool Categories

### 🔄 Conversational Analysis Tools

Multi-turn AI-to-AI conversation tools for complex analysis

### 🔍 Traditional Analysis Tools  

Single-shot analysis tools for specific tasks

### 💡 Hypothesis Testing Tools

Automated hypothesis generation and validation

### 🏥 Health Monitoring Tools

System health and operational monitoring

---

## Conversational Analysis Tools

### start_conversation

**Purpose**: Initiates a multi-turn conversation between Claude and Gemini for complex analysis tasks.

**When to Use**:

- Complex debugging scenarios requiring back-and-forth analysis
- Large codebase exploration needing iterative refinement
- Multi-step problem solving with evolving context

**Input Parameters**:

```typescript
{
  claude_context: {
    attempted_approaches: string[];      // What Claude has already tried
    partial_findings: any[];            // What Claude discovered so far
    stuck_description: string;          // Where Claude needs help
    code_scope: {
      files: string[];                  // Files to analyze
      entry_points?: CodeLocation[];    // Starting points
      service_names?: string[];         // Services involved
    }
  };
  analysis_focus: 'debugging' | 'optimization' | 'architecture' | 'testing';
  depth_level: 1 | 2 | 3 | 4 | 5;      // Analysis depth (1=shallow, 5=deep)
}
```

**Example Usage**:

```typescript
{
  "claude_context": {
    "attempted_approaches": [
      "Traced function calls in UserService",
      "Checked database connection pools",
      "Reviewed error logs for patterns"
    ],
    "partial_findings": [
      {
        "type": "performance_issue",
        "location": "src/services/UserService.ts:145",
        "description": "Suspected N+1 query pattern"
      }
    ],
    "stuck_description": "Performance issue appears related to database queries but root cause unclear",
    "code_scope": {
      "files": [
        "src/services/UserService.ts",
        "src/repositories/UserRepository.ts",
        "src/database/connection.ts"
      ],
      "entry_points": [
        {
          "file": "src/services/UserService.ts",
          "line": 145,
          "function_name": "getUsersWithProfiles"
        }
      ]
    }
  },
  "analysis_focus": "optimization",
  "depth_level": 3
}
```

**Response Format**:

```typescript
{
  session_id: string;                   // Unique conversation ID
  gemini_response: string;              // Gemini's initial analysis
  next_steps: string[];                 // Suggested follow-up actions
  estimated_turns: number;              // Expected conversation length
}
```

---

### continue_conversation

**Purpose**: Continues an active conversation with Claude's response or follow-up questions.

**When to Use**:

- Responding to Gemini's questions or requests for clarification
- Providing additional context based on Gemini's initial analysis
- Iterating on solutions proposed by Gemini

**Input Parameters**:

```typescript
{
  session_id: string;                   // Active session ID
  message: string;                      // Claude's message/response to Gemini
  include_code_snippets?: boolean;      // Enrich with relevant code context
  attach_files?: string[];              // Additional files to include
}
```

**Example Usage**:

```typescript
{
  "session_id": "conv_1234567890",
  "message": "I found the N+1 pattern you mentioned. Here's what I see in the logs: each getUsersWithProfiles call triggers 50+ individual profile queries. Should I implement eager loading or a separate batch query?",
  "include_code_snippets": true,
  "attach_files": [
    "logs/performance-20240307.log",
    "src/models/Profile.ts"
  ]
}
```

**Response Format**:

```typescript
{
  session_id: string;
  gemini_response: string;              // Gemini's continued analysis
  conversation_status: 'active' | 'near_completion' | 'needs_more_info';
  suggested_action?: string;            // Recommended next step
}
```

---

### finalize_conversation

**Purpose**: Completes the conversation and generates structured analysis results.

**When to Use**:

- When the conversation has reached a natural conclusion
- To get a comprehensive summary of findings and recommendations
- Before implementing solutions discovered through conversation

**Input Parameters**:

```typescript
{
  session_id: string;                   // Active session ID
  summary_format: 'detailed' | 'concise' | 'actionable';
}
```

**Example Usage**:

```typescript
{
  "session_id": "conv_1234567890",
  "summary_format": "actionable"
}
```

**Response Format**:

```typescript
{
  session_id: string;
  conversation_summary: {
    problem_identified: string;
    root_causes: string[];
    solutions_discussed: Solution[];
    recommended_action: {
      priority: 'high' | 'medium' | 'low';
      steps: string[];
      estimated_effort: string;
      risks: string[];
    };
    conversation_turns: number;
    analysis_duration: string;
  };
  artifacts: {
    code_snippets: CodeSnippet[];
    logs_analyzed: string[];
    metrics_collected: any[];
  };
}
```

---

### get_conversation_status

**Purpose**: Checks the status and progress of an ongoing conversation.

**When to Use**:

- Monitoring long-running conversations
- Checking if a conversation is still active before continuing
- Getting progress updates on complex analysis

**Input Parameters**:

```typescript
{
  session_id: string;                   // Session ID to check
}
```

**Response Format**:

```typescript
{
  session_id: string;
  status: 'active' | 'idle' | 'completed' | 'error' | 'timeout';
  turns_completed: number;
  last_activity: string;                // ISO timestamp
  current_focus: string;                // What's being analyzed
  progress_estimate: number;            // 0-100 percentage
}
```

---

## Traditional Analysis Tools

### escalate_analysis

**Purpose**: Main tool for handing off complex analysis from Claude Code to Gemini.

**When to Use**:

- Single-shot analysis of complex problems
- Large context analysis (>100k tokens)
- Cross-system impact analysis
- Performance bottleneck identification

**Input Parameters**:

```typescript
{
  claude_context: {
    attempted_approaches: string[];
    partial_findings: any[];
    stuck_description: string;
    code_scope: {
      files: string[];
      entry_points?: CodeLocation[];
      service_names?: string[];
    }
  };
  analysis_type: 'execution_trace' | 'cross_system' | 'performance' | 'hypothesis_test';
  depth_level: 1 | 2 | 3 | 4 | 5;
  time_budget_seconds?: number;         // Default: 60
}
```

**Example Usage**:

```typescript
{
  "claude_context": {
    "attempted_approaches": ["Local debugging", "Log analysis"],
    "partial_findings": [],
    "stuck_description": "Intermittent race condition in distributed system",
    "code_scope": {
      "files": ["src/services/OrderService.ts", "src/queue/OrderQueue.ts"],
      "service_names": ["order-service", "payment-service", "inventory-service"]
    }
  },
  "analysis_type": "cross_system",
  "depth_level": 4,
  "time_budget_seconds": 120
}
```

---

### trace_execution_path

**Purpose**: Deep execution analysis with Gemini's semantic understanding.

**When to Use**:

- Understanding complex execution flows
- Identifying bottlenecks in execution paths
- Analyzing data flow through system components

**Input Parameters**:

```typescript
{
  entry_point: {
    file: string;
    line: number;
    function_name?: string;
  };
  max_depth?: number;                   // Default: 10
  include_data_flow?: boolean;          // Default: true
  focus_areas?: ('performance' | 'error_handling' | 'data_flow')[];
}
```

**Example Usage**:

```typescript
{
  "entry_point": {
    "file": "src/api/controllers/UserController.ts",
    "line": 45,
    "function_name": "createUser"
  },
  "max_depth": 15,
  "include_data_flow": true,
  "focus_areas": ["performance", "error_handling"]
}
```

---

### cross_system_impact

**Purpose**: Analyze impacts across service boundaries.

**When to Use**:

- Before making changes to shared components
- Understanding downstream effects of modifications
- Planning microservice updates

**Input Parameters**:

```typescript
{
  change_scope: {
    files: string[];
    service_names?: string[];
    api_endpoints?: string[];
  };
  impact_types?: ('breaking' | 'performance' | 'behavioral')[];
  analysis_depth?: 1 | 2 | 3 | 4 | 5;
}
```

---

### performance_bottleneck

**Purpose**: Deep performance analysis beyond simple profiling.

**When to Use**:

- Investigating performance issues
- Optimizing critical code paths
- Understanding resource utilization patterns

**Input Parameters**:

```typescript
{
  code_path: {
    entry_point: {
      file: string;
      line: number;
      function_name?: string;
    };
    suspected_issues?: string[];
  };
  profile_depth?: 1 | 2 | 3 | 4 | 5;    // Default: 3
  include_memory_analysis?: boolean;     // Default: true
}
```

---

### hypothesis_test

**Purpose**: Test specific theories about code behavior.

**When to Use**:

- Validating assumptions about bugs
- Testing performance hypotheses
- Confirming architectural theories

**Input Parameters**:

```typescript
{
  hypothesis: {
    description: string;
    type: 'bug' | 'performance' | 'behavior' | 'security';
    confidence_level: 1 | 2 | 3 | 4 | 5;
  };
  test_scope: {
    files: string[];
    functions?: string[];
    test_data?: any;
  };
  validation_method?: 'static_analysis' | 'trace_simulation' | 'pattern_matching';
}
```

---

## Advanced Tools

### run_hypothesis_tournament

**Purpose**: Runs multiple hypotheses in parallel and ranks them by likelihood.

**When to Use**:

- Multiple competing theories about an issue
- Systematic elimination of possibilities
- Comprehensive problem analysis

**Input Parameters**:

```typescript
{
  hypotheses: Array<{
    id: string;
    description: string;
    type: 'bug' | 'performance' | 'behavior' | 'security';
    confidence_level: 1 | 2 | 3 | 4 | 5;
  }>;
  test_scope: {
    files: string[];
    functions?: string[];
    shared_context?: any;
  };
  tournament_settings?: {
    max_parallel: number;               // Default: 3
    timeout_per_hypothesis: number;     // Default: 30 seconds
  };
}
```

**Response Format**:

```typescript
{
  tournament_id: string;
  results: Array<{
    hypothesis_id: string;
    likelihood_score: number;          // 0-100
    evidence: string[];
    counter_evidence: string[];
    test_duration: number;
  }>;
  winner: {
    hypothesis_id: string;
    confidence: number;
    recommendation: string;
  };
  execution_time: number;
}
```

---

## Health Monitoring Tools

### health_check

**Purpose**: Run specific health checks on server components.

**When to Use**:

- Debugging server issues
- Monitoring system health
- Troubleshooting performance problems

**Input Parameters**:

```typescript
{
  check_name?: string;                  // Specific check to run, omit for all
}
```

**Available Checks**:

- `memory_usage`: Check memory consumption
- `system_startup`: Verify system initialization
- `event_bus`: Test event system functionality
- `gemini_api`: Validate Gemini API connectivity

---

### health_summary

**Purpose**: Get comprehensive health status of the MCP server.

**When to Use**:

- System overview and monitoring
- Performance baseline establishment
- Operational health verification

**Input Parameters**:

```typescript
{
  include_details?: boolean;            // Default: true
}
```

**Response Format**:

```typescript
{
  overall_status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    duration: number;
    details?: any;
  }>;
  performance_metrics: {
    uptime: number;
    memory_usage: number;
    api_response_time: number;
  };
  recommendations?: string[];
}
```

---

## Best Practices

### Tool Selection Guidelines

1. **Start with Traditional Tools** for single-shot analysis
2. **Use Conversational Tools** for complex, multi-step problems
3. **Leverage Hypothesis Testing** when you have specific theories
4. **Monitor Health** regularly for optimal performance

### Parameter Optimization

- **Depth Levels**: Start with 3, increase only if needed
- **Time Budgets**: Use defaults unless time-critical
- **Context Scope**: Include only relevant files to avoid noise
- **Analysis Focus**: Be specific about what you're looking for

### Error Handling

All tools implement comprehensive error handling:

- Input validation with detailed error messages
- Graceful degradation for partial failures
- Retry logic for transient issues
- Comprehensive logging for debugging
