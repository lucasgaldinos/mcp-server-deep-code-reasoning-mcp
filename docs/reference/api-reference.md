- [API Reference](#api-reference)
  - [Overview](#overview)
  - [Protocol Implementation](#protocol-implementation)
    - [MCP Protocol Version](#mcp-protocol-version)
    - [Server Information](#server-information)
  - [Tool Schemas](#tool-schemas)
    - [Common Types](#common-types)
      - [CodeLocation](#codelocation)
      - [ClaudeCodeContext](#claudecodecontext)
      - [AnalysisResult](#analysisresult)
  - [Tool APIs](#tool-apis)
    - [Conversational Analysis Tools](#conversational-analysis-tools)
      - [start\_conversation](#start_conversation)
      - [continue\_conversation](#continue_conversation)
      - [finalize\_conversation](#finalize_conversation)
      - [get\_conversation\_status](#get_conversation_status)
    - [Traditional Analysis Tools](#traditional-analysis-tools)
      - [escalate\_analysis](#escalate_analysis)
      - [trace\_execution\_path](#trace_execution_path)
      - [hypothesis\_test](#hypothesis_test)
      - [cross\_system\_impact](#cross_system_impact)
      - [performance\_bottleneck](#performance_bottleneck)
    - [Advanced Tools](#advanced-tools)
      - [run\_hypothesis\_tournament](#run_hypothesis_tournament)
    - [Health Monitoring Tools](#health-monitoring-tools)
      - [health\_check](#health_check)
      - [health\_summary](#health_summary)
  - [Error Handling](#error-handling)
    - [Error Response Schema](#error-response-schema)
    - [Error Codes](#error-codes)
    - [Error Categories](#error-categories)
      - [Validation Errors](#validation-errors)
      - [Session Errors](#session-errors)
      - [API Errors](#api-errors)
  - [Rate Limits](#rate-limits)
    - [Default Limits](#default-limits)
    - [Rate Limit Headers](#rate-limit-headers)
  - [Request/Response Examples](#requestresponse-examples)
    - [Complete Example: Performance Analysis](#complete-example-performance-analysis)

# API Reference

## Overview

The Deep Code Reasoning MCP Server implements the Model Context Protocol (MCP) v0.1.0 specification and provides 13 specialized analysis tools. This document provides comprehensive API documentation for all available tools and their parameters.

## Protocol Implementation

### MCP Protocol Version

- **Version**: 0.1.0
- **Transport**: Standard I/O (stdio)
- **Format**: JSON-RPC 2.0

### Server Information

```json
{
  "name": "deep-code-reasoning-mcp",
  "version": "0.1.0",
  "capabilities": {
    "tools": {}
  }
}
```

## Tool Schemas

### Common Types

#### CodeLocation

```typescript
interface CodeLocation {
  file: string;              // Absolute or relative file path
  line: number;              // Line number (1-based)
  function_name?: string;    // Optional function name
}
```

#### ClaudeCodeContext

```typescript
interface ClaudeCodeContext {
  attempted_approaches: string[];    // What Claude has tried
  partial_findings: any[];          // What Claude discovered
  stuck_description: string;        // Where Claude needs help
  code_scope: {
    files: string[];                // Files to analyze
    entry_points?: CodeLocation[];  // Starting points
    service_names?: string[];       // Services involved
  };
}
```

#### AnalysisResult

```typescript
interface AnalysisResult {
  analysis_id: string;
  findings: {
    root_cause?: string;
    evidence: string[];
    confidence_level: 1 | 2 | 3 | 4 | 5;
  };
  recommendations: string[];
  execution_time: number;
  metadata?: any;
}
```

## Tool APIs

### Conversational Analysis Tools

#### start_conversation

**Purpose**: Initiates a multi-turn AI conversation for complex analysis.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "claude_context": {
      "type": "object",
      "properties": {
        "attempted_approaches": {
          "type": "array",
          "items": {"type": "string"},
          "description": "Approaches Claude has already tried"
        },
        "partial_findings": {
          "type": "array",
          "items": {"type": "object"},
          "description": "Findings Claude has discovered"
        },
        "stuck_description": {
          "type": "string",
          "description": "Description of where Claude needs help"
        },
        "code_scope": {
          "type": "object",
          "properties": {
            "files": {
              "type": "array", 
              "items": {"type": "string"}
            },
            "entry_points": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "file": {"type": "string"},
                  "line": {"type": "number"},
                  "function_name": {"type": "string"}
                },
                "required": ["file", "line"]
              }
            },
            "service_names": {
              "type": "array",
              "items": {"type": "string"}
            }
          },
          "required": ["files"]
        }
      },
      "required": ["attempted_approaches", "partial_findings", "stuck_description", "code_scope"]
    },
    "analysis_focus": {
      "type": "string",
      "enum": ["debugging", "optimization", "architecture", "testing"],
      "description": "Primary focus of the analysis"
    },
    "depth_level": {
      "type": "number",
      "minimum": 1,
      "maximum": 5,
      "description": "Analysis depth (1=shallow, 5=deep)"
    }
  },
  "required": ["claude_context", "analysis_focus", "depth_level"]
}
```

**Response Schema**:

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "Unique conversation identifier"
    },
    "gemini_response": {
      "type": "string", 
      "description": "Gemini's initial analysis response"
    },
    "next_steps": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Suggested follow-up actions"
    },
    "estimated_turns": {
      "type": "number",
      "description": "Expected conversation length"
    }
  },
  "required": ["session_id", "gemini_response", "next_steps", "estimated_turns"]
}
```

#### continue_conversation

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "Active conversation session ID"
    },
    "message": {
      "type": "string",
      "description": "Claude's message to Gemini"
    },
    "include_code_snippets": {
      "type": "boolean",
      "default": false,
      "description": "Include relevant code context"
    },
    "attach_files": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Additional files to include"
    }
  },
  "required": ["session_id", "message"]
}
```

**Response Schema**:

```json
{
  "type": "object", 
  "properties": {
    "session_id": {"type": "string"},
    "gemini_response": {"type": "string"},
    "conversation_status": {
      "type": "string",
      "enum": ["active", "near_completion", "needs_more_info"]
    },
    "suggested_action": {"type": "string"}
  },
  "required": ["session_id", "gemini_response", "conversation_status"]
}
```

#### finalize_conversation

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "Session to finalize"
    },
    "summary_format": {
      "type": "string",
      "enum": ["detailed", "concise", "actionable"],
      "default": "actionable",
      "description": "Format for the final summary"
    }
  },
  "required": ["session_id"]
}
```

**Response Schema**:

```json
{
  "type": "object",
  "properties": {
    "session_id": {"type": "string"},
    "conversation_summary": {
      "type": "object",
      "properties": {
        "problem_identified": {"type": "string"},
        "root_causes": {
          "type": "array",
          "items": {"type": "string"}
        },
        "solutions_discussed": {
          "type": "array", 
          "items": {
            "type": "object",
            "properties": {
              "description": {"type": "string"},
              "feasibility": {"type": "string"},
              "effort_estimate": {"type": "string"}
            }
          }
        },
        "recommended_action": {
          "type": "object",
          "properties": {
            "priority": {
              "type": "string",
              "enum": ["high", "medium", "low"]
            },
            "steps": {
              "type": "array",
              "items": {"type": "string"}
            },
            "estimated_effort": {"type": "string"},
            "risks": {
              "type": "array", 
              "items": {"type": "string"}
            }
          }
        },
        "conversation_turns": {"type": "number"},
        "analysis_duration": {"type": "string"}
      }
    },
    "artifacts": {
      "type": "object",
      "properties": {
        "code_snippets": {"type": "array"},
        "logs_analyzed": {"type": "array"},
        "metrics_collected": {"type": "array"}
      }
    }
  },
  "required": ["session_id", "conversation_summary"]
}
```

#### get_conversation_status

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "description": "Session ID to check"
    }
  },
  "required": ["session_id"]
}
```

**Response Schema**:

```json
{
  "type": "object",
  "properties": {
    "session_id": {"type": "string"},
    "status": {
      "type": "string", 
      "enum": ["active", "idle", "completed", "error", "timeout"]
    },
    "turns_completed": {"type": "number"},
    "last_activity": {"type": "string"},
    "current_focus": {"type": "string"},
    "progress_estimate": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    }
  },
  "required": ["session_id", "status", "turns_completed", "last_activity"]
}
```

### Traditional Analysis Tools

#### escalate_analysis

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "claude_context": {
      "type": "object",
      "description": "Context from Claude's analysis attempts"
    },
    "analysis_type": {
      "type": "string",
      "enum": ["execution_trace", "cross_system", "performance", "hypothesis_test"],
      "description": "Type of analysis to perform"
    },
    "depth_level": {
      "type": "number",
      "minimum": 1,
      "maximum": 5,
      "description": "Analysis depth level"
    },
    "time_budget_seconds": {
      "type": "number",
      "minimum": 10,
      "maximum": 300,
      "default": 60,
      "description": "Maximum time for analysis"
    }
  },
  "required": ["claude_context", "analysis_type", "depth_level"]
}
```

#### trace_execution_path

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "entry_point": {
      "type": "object",
      "properties": {
        "file": {"type": "string"},
        "line": {"type": "number"},
        "function_name": {"type": "string"}
      },
      "required": ["file", "line"]
    },
    "max_depth": {
      "type": "number",
      "minimum": 1,
      "maximum": 50,
      "default": 10,
      "description": "Maximum trace depth"
    },
    "include_data_flow": {
      "type": "boolean",
      "default": true,
      "description": "Include data flow analysis"
    },
    "focus_areas": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["performance", "error_handling", "data_flow"]
      },
      "description": "Specific areas to focus on"
    }
  },
  "required": ["entry_point"]
}
```

#### hypothesis_test

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "hypothesis": {
      "type": "object",
      "properties": {
        "description": {"type": "string"},
        "type": {
          "type": "string",
          "enum": ["bug", "performance", "behavior", "security"]
        },
        "confidence_level": {
          "type": "number",
          "minimum": 1,
          "maximum": 5
        }
      },
      "required": ["description", "type", "confidence_level"]
    },
    "test_scope": {
      "type": "object",
      "properties": {
        "files": {
          "type": "array",
          "items": {"type": "string"}
        },
        "functions": {
          "type": "array", 
          "items": {"type": "string"}
        },
        "test_data": {"type": "object"}
      },
      "required": ["files"]
    },
    "validation_method": {
      "type": "string",
      "enum": ["static_analysis", "trace_simulation", "pattern_matching"],
      "default": "static_analysis"
    }
  },
  "required": ["hypothesis", "test_scope"]
}
```

#### cross_system_impact

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "change_scope": {
      "type": "object",
      "properties": {
        "files": {
          "type": "array",
          "items": {"type": "string"}
        },
        "service_names": {
          "type": "array",
          "items": {"type": "string"}
        },
        "api_endpoints": {
          "type": "array",
          "items": {"type": "string"}
        }
      },
      "required": ["files"]
    },
    "impact_types": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["breaking", "performance", "behavioral"]
      },
      "default": ["breaking", "performance", "behavioral"]
    },
    "analysis_depth": {
      "type": "number",
      "minimum": 1,
      "maximum": 5,
      "default": 3
    }
  },
  "required": ["change_scope"]
}
```

#### performance_bottleneck

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "code_path": {
      "type": "object",
      "properties": {
        "entry_point": {
          "type": "object",
          "properties": {
            "file": {"type": "string"},
            "line": {"type": "number"},
            "function_name": {"type": "string"}
          },
          "required": ["file", "line"]
        },
        "suspected_issues": {
          "type": "array",
          "items": {"type": "string"},
          "description": "Areas suspected of causing bottlenecks"
        }
      },
      "required": ["entry_point"]
    },
    "profile_depth": {
      "type": "number",
      "minimum": 1,
      "maximum": 5,
      "default": 3
    },
    "include_memory_analysis": {
      "type": "boolean",
      "default": true
    }
  },
  "required": ["code_path"]
}
```

### Advanced Tools

#### run_hypothesis_tournament

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "hypotheses": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "description": {"type": "string"},
          "type": {
            "type": "string",
            "enum": ["bug", "performance", "behavior", "security"]
          },
          "confidence_level": {
            "type": "number",
            "minimum": 1,
            "maximum": 5
          }
        },
        "required": ["id", "description", "type", "confidence_level"]
      },
      "minItems": 2,
      "maxItems": 10
    },
    "test_scope": {
      "type": "object",
      "properties": {
        "files": {
          "type": "array",
          "items": {"type": "string"}
        },
        "functions": {
          "type": "array",
          "items": {"type": "string"}
        },
        "shared_context": {"type": "object"}
      },
      "required": ["files"]
    },
    "tournament_settings": {
      "type": "object",
      "properties": {
        "max_parallel": {
          "type": "number",
          "minimum": 1,
          "maximum": 5,
          "default": 3
        },
        "timeout_per_hypothesis": {
          "type": "number",
          "minimum": 10,
          "maximum": 120,
          "default": 30
        }
      }
    }
  },
  "required": ["hypotheses", "test_scope"]
}
```

**Response Schema**:

```json
{
  "type": "object",
  "properties": {
    "tournament_id": {"type": "string"},
    "results": {
      "type": "array",
      "items": {
        "type": "object", 
        "properties": {
          "hypothesis_id": {"type": "string"},
          "likelihood_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "evidence": {
            "type": "array",
            "items": {"type": "string"}
          },
          "counter_evidence": {
            "type": "array",
            "items": {"type": "string"}
          },
          "test_duration": {"type": "number"}
        }
      }
    },
    "winner": {
      "type": "object",
      "properties": {
        "hypothesis_id": {"type": "string"},
        "confidence": {"type": "number"},
        "recommendation": {"type": "string"}
      }
    },
    "execution_time": {"type": "number"}
  },
  "required": ["tournament_id", "results", "winner", "execution_time"]
}
```

### Health Monitoring Tools

#### health_check

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "check_name": {
      "type": "string",
      "enum": ["memory_usage", "system_startup", "event_bus", "gemini_api"],
      "description": "Specific check to run, omit for all checks"
    }
  }
}
```

**Response Schema**:

```json
{
  "type": "object",
  "properties": {
    "check_name": {"type": "string"},
    "status": {
      "type": "string",
      "enum": ["pass", "fail", "warn"]
    },
    "duration": {"type": "number"},
    "details": {
      "type": "object",
      "properties": {
        "message": {"type": "string"},
        "metrics": {"type": "object"},
        "recommendations": {
          "type": "array",
          "items": {"type": "string"}
        }
      }
    },
    "timestamp": {"type": "string"}
  },
  "required": ["check_name", "status", "duration", "timestamp"]
}
```

#### health_summary

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "include_details": {
      "type": "boolean",
      "default": true,
      "description": "Include detailed check results"
    }
  }
}
```

**Response Schema**:

```json
{
  "type": "object",
  "properties": {
    "overall_status": {
      "type": "string",
      "enum": ["healthy", "degraded", "critical"]
    },
    "timestamp": {"type": "string"},
    "checks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "status": {
            "type": "string", 
            "enum": ["pass", "fail", "warn"]
          },
          "duration": {"type": "number"},
          "details": {"type": "object"}
        }
      }
    },
    "performance_metrics": {
      "type": "object",
      "properties": {
        "uptime": {"type": "number"},
        "memory_usage": {"type": "number"},
        "api_response_time": {"type": "number"}
      }
    },
    "recommendations": {
      "type": "array",
      "items": {"type": "string"}
    }
  },
  "required": ["overall_status", "timestamp", "checks"]
}
```

## Error Handling

### Error Response Schema

All tools return errors in the standard MCP format:

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "error": {
    "code": -32000,
    "message": "Error description",
    "data": {
      "type": "error_type",
      "details": "Additional error information"
    }
  }
}
```

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse Error | Invalid JSON |
| -32600 | Invalid Request | Invalid Request object |
| -32601 | Method Not Found | Method does not exist |
| -32602 | Invalid Params | Invalid method parameters |
| -32603 | Internal Error | Internal JSON-RPC error |
| -32000 | Server Error | Server-specific error |

### Error Categories

#### Validation Errors

```json
{
  "code": -32602,
  "message": "Invalid parameters: depth_level must be between 1 and 5",
  "data": {
    "type": "validation_error",
    "field": "depth_level",
    "value": 10,
    "constraint": "1 <= value <= 5"
  }
}
```

#### Session Errors  

```json
{
  "code": -32000,
  "message": "Session not found",
  "data": {
    "type": "session_error",
    "session_id": "invalid-session-id"
  }
}
```

#### API Errors

```json
{
  "code": -32000,
  "message": "Gemini API request failed",
  "data": {
    "type": "api_error",
    "service": "gemini",
    "retry_after": 30
  }
}
```

## Rate Limits

### Default Limits

- **Requests per minute**: 60
- **Concurrent conversations**: 5
- **Maximum context size**: 1,000,000 tokens
- **Maximum analysis time**: 300 seconds

### Rate Limit Headers

```json
{
  "X-RateLimit-Limit": "60",
  "X-RateLimit-Remaining": "59", 
  "X-RateLimit-Reset": "1640995200"
}
```

## Request/Response Examples

### Complete Example: Performance Analysis

**Request**:

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "method": "tools/call",
  "params": {
    "name": "performance_bottleneck",
    "arguments": {
      "code_path": {
        "entry_point": {
          "file": "src/services/UserService.ts",
          "line": 45,
          "function_name": "getUserProfile"
        },
        "suspected_issues": ["database queries", "memory allocation"]
      },
      "profile_depth": 4,
      "include_memory_analysis": true
    }
  }
}
```

**Response**:

```json
{
  "jsonrpc": "2.0", 
  "id": "123",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"analysis_id\":\"perf_456\",\"findings\":{\"root_cause\":\"N+1 query pattern in user profile loading\",\"evidence\":[\"50+ individual profile queries per request\",\"Database connection pool exhaustion\",\"Response time correlation with user count\"],\"confidence_level\":4},\"recommendations\":[\"Implement eager loading for user profiles\",\"Add query batching for profile data\",\"Consider caching for frequently accessed profiles\"],\"performance_impact\":{\"current_response_time\":\"2000ms avg\",\"projected_improvement\":\"85% reduction\",\"memory_overhead\":\"15MB per request\"},\"execution_time\":67.3}"
      }
    ]
  }
}
```

This API reference provides complete schemas and examples for all available tools in the Deep Code Reasoning MCP Server.
