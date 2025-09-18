# MCP Tool Parameter Pattern Analysis

## Working Tools Analysis ✅

### 1. `health_check` Tool - WORKING ✅

**Schema Pattern:**

- **Parameter**: `check_name` (snake_case)
- **Type**: Simple string (optional)
- **Zod Schema**: `z.string().optional()`

**MCP Tool Definition:**

```typescript
inputSchema: {
  type: 'object',
  properties: {
    check_name: {
      type: 'string',
      description: 'Name of specific health check to run. If omitted, runs all checks.'
    }
  },
  required: []
}
```

### 2. `health_summary` Tool - WORKING ✅

**Schema Pattern:**

- **Parameter**: `include_details` (snake_case)
- **Type**: Simple boolean (optional, default true)
- **Zod Schema**: `z.boolean().optional().default(true)`

**MCP Tool Definition:**

```typescript
inputSchema: {
  type: 'object',
  properties: {
    include_details: {
      type: 'boolean',
      description: 'Include detailed check results in the summary',
      default: true
    }
  },
  required: []
}
```

### 3. `trace_execution_path` Tool - WORKING ✅

**Schema Pattern:**

- **Parameters**: `entryPoint`, `maxDepth`, `includeDataFlow` (camelCase)
- **Types**: Simple object structure, no deep nesting
- **Zod Schema**: Direct object with simple properties

**MCP Tool Definition:**

```typescript
inputSchema: {
  type: 'object',
  properties: {
    entryPoint: {
      type: 'object',
      properties: {
        file: { type: 'string' },
        functionName: { type: 'string' },
        line: { type: 'number' }
      },
      required: ['file', 'line']
    },
    maxDepth: { type: 'number', default: 10 },
    includeDataFlow: { type: 'boolean', default: true }
  },
  required: ['entryPoint']
}
```

## Failing Tools Analysis ❌

### 1. `escalate_analysis` Tool - FAILING ❌

**Schema Pattern:**

- **Parameter**: `analysisContext` (camelCase)
- **Type**: COMPLEX NESTED STRUCTURE with ClaudeCodeContext
- **Issue**: Uses ClaudeCodeContextSchema with deep nesting

**MCP Tool Definition:**

```typescript
inputSchema: {
  type: 'object',
  properties: {
    analysisContext: {
      type: 'object',
      properties: {
        attemptedApproaches: {  // SNAKE_CASE in MCP definition
          type: 'array',
          items: { type: 'string' }
        },
        partialFindings: {      // SNAKE_CASE in MCP definition
          type: 'array',
          items: { type: 'object' }
        },
        stuckPoints: {          // CAMEL_CASE in MCP definition
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  }
}
```

**ERROR PATTERN**:

```
"attempted_approaches: Required, partial_findings: Required, stuck_description: Required, code_scope: Required"
```

### 2. `start_conversation` Tool - FAILING ❌

**Same issue**: Uses ClaudeCodeContextSchema with complex nested structure

## CRITICAL DISCOVERY - THE FIX ✅

### The Parameter Format Solution

**ROOT CAUSE CONFIRMED**: VS Code MCP client expects **FLAT parameter structure**, not nested objects.

**SUCCESSFUL FIX PATTERN**:

```typescript
// ❌ FAILING (Nested structure)
inputSchema: {
  properties: {
    analysisContext: {
      type: 'object',
      properties: {
        attemptedApproaches: { ... },
        partialFindings: { ... }
      }
    }
  }
}

// ✅ WORKING (Flat structure)
inputSchema: {
  properties: {
    attempted_approaches: { type: 'array', items: { type: 'string' } },
    partial_findings: { type: 'array', items: { type: 'object' } },
    stuck_description: { type: 'array', items: { type: 'string' } },
    code_scope: { type: 'object', properties: { files: {...} } },
    analysisType: { type: 'string', enum: [...] },
    depthLevel: { type: 'number' }
  },
  required: ['attempted_approaches', 'partial_findings', 'stuck_description', 'code_scope', 'analysisType', 'depthLevel']
}
```

### Implementation Strategy

1. **Update MCP Tool Definition**: Use flat parameter structure in `inputSchema`
2. **Create Flat Zod Schema**: New schema matching flat parameters  
3. **Transform in Handler**: Convert flat parameters to internal ClaudeCodeContext format
4. **Test Thoroughly**: Verify tool works with VS Code MCP client

### Applied To

- ✅ `escalate_analysis` - FIXED with flat parameter structure
- 🔄 `start_conversation` - Next to fix
- 🔄 `run_hypothesis_tournament` - Next to fix  
- 🔄 `cross_system_impact` - Next to fix
- 🔄 `continue_conversation` - Next to fix
- 🔄 `finalize_conversation` - Next to fix

## Parameter Format Standards

### Working Pattern (Successful Tools)

```typescript
// MCP Tool Definition
inputSchema: {
  type: 'object',
  properties: {
    entryPoint: { ... },     // camelCase matches Zod
    maxDepth: { ... },       // camelCase matches Zod
    includeDataFlow: { ... } // camelCase matches Zod
  }
}

// Zod Schema
const Schema = z.object({
  entryPoint: z.object(...),     // camelCase
  maxDepth: z.number().optional(), // camelCase
  includeDataFlow: z.boolean().optional() // camelCase
});
```

### Failing Pattern (Broken Tools)

```typescript
// MCP Tool Definition (SNAKE_CASE)
inputSchema: {
  properties: {
    attempted_approaches: { ... }, // snake_case
    partial_findings: { ... }      // snake_case
  }
}

// Zod Schema (CAMEL_CASE)
const Schema = z.object({
  attemptedApproaches: z.array(...), // camelCase
  partialFindings: z.array(...)      // camelCase
});
```

## Action Plan

1. **Fix MCP Tool Definitions**: Update all `inputSchema` properties to use camelCase matching Zod schemas
2. **Test Each Tool**: Verify parameter format compatibility
3. **Document Standards**: Establish consistent parameter naming convention

## Priority Fix Order

1. `escalate_analysis` - Most critical, used for complex analysis
2. `start_conversation` - Second most important for conversational analysis
3. `run_hypothesis_tournament` - Advanced analysis feature
4. `cross_system_impact` - System-wide analysis
5. `continue_conversation` - Conversational flow
6. `finalize_conversation` - Conversational completion
