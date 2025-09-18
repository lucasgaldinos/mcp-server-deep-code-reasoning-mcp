# Parameter Mapping Documentation

## Overview

This document describes the parameter format transformation that occurs between the external MCP API (which uses snake_case) and the internal TypeScript code (which uses camelCase). Understanding this mapping is crucial for proper MCP tool usage and debugging.

## Format Conversion Pattern

### External API Format (snake_case)

The MCP protocol receives parameters from VS Code in snake_case format:

```json
{
  "analysisContext": {
    "attempted_approaches": ["approach1", "approach2"],
    "partial_findings": [{"type": "bug", "severity": "high", ...}],
    "stuck_description": "Description of where analysis got stuck",
    "code_scope": {
      "files": ["/path/to/file1.ts", "/path/to/file2.ts"],
      "entryPoints": [{"file": "/path/to/main.ts", "line": 42}],
      "serviceNames": ["ServiceA", "ServiceB"]
    }
  }
}
```

### Internal TypeScript Format (camelCase)

The validated input is transformed to camelCase for internal processing:

```typescript
interface ClaudeCodeContext {
  attemptedApproaches: string[];
  partialFindings: Finding[];
  stuckPoints: string[];  // Note: converted from single string to array
  focusArea: {
    files: string[];
    entryPoints: EntryPoint[];
    serviceNames?: string[];
    searchPatterns?: string[];
  };
  analysisBudgetRemaining: number;  // Default: 60 seconds
}
```

## Transformation Logic

The transformation occurs in `src/utils/input-validator.ts` within the `validateClaudeContext()` method:

### Key Transformations

1. **attempted_approaches** → **attemptedApproaches**
   - Direct array mapping
   - Validates each string for safety

2. **partial_findings** → **partialFindings**
   - Validates each finding object against Finding schema
   - Skips invalid findings with warning

3. **stuck_description** → **stuckPoints**
   - Converts single string to array format
   - Maintains backward compatibility

4. **code_scope** → **focusArea**
   - Renames the container object
   - Maps all nested properties
   - Adds default empty arrays for optional fields

## MCP Tools Affected

The following MCP tools rely on this parameter transformation:

### Primary Tools (High Usage)

- `escalate_analysis` - Core analysis escalation
- `start_conversation` - Conversational analysis
- `continue_conversation` - Conversation continuation
- `trace_execution_path` - Execution tracing
- `cross_system_impact` - Cross-system analysis

### Secondary Tools (Medium Usage)

- `hypothesis_test` - Hypothesis testing
- `performance_bottleneck` - Performance analysis
- `run_hypothesis_tournament` - Tournament analysis

## Validation Rules

### String Validation

- Maximum length: 2000 characters
- Regex pattern: `^[^<>{}]*$` (no angle brackets or braces)
- Path traversal protection: no `..` sequences

### Array Validation

- Maximum array size: 100 items
- File paths: maximum 255 characters, alphanumeric + `._-/`
- Finding objects: maximum 50 findings per array

### Security Features

- Input sanitization prevents XSS attacks
- File path validation prevents directory traversal
- Length limits prevent memory exhaustion
- Type validation ensures data integrity

## Usage Examples

### Correct External API Call

```json
{
  "analysisContext": {
    "attempted_approaches": [
      "Analyzed main function flow",
      "Checked error handling patterns"
    ],
    "partial_findings": [
      {
        "type": "performance",
        "severity": "medium",
        "location": {
          "file": "src/services/ApiService.ts",
          "line": 145,
          "functionName": "fetchData"
        },
        "description": "Synchronous database call in async function",
        "evidence": ["Line 145: db.query() should be await db.query()"]
      }
    ],
    "stuck_description": "Unable to trace execution path through Promise.all() chains",
    "code_scope": {
      "files": ["src/services/ApiService.ts", "src/utils/DatabaseUtil.ts"],
      "entryPoints": [
        {
          "file": "src/services/ApiService.ts",
          "line": 42,
          "functionName": "handleRequest"
        }
      ],
      "serviceNames": ["ApiService", "DatabaseService"]
    }
  }
}
```

### Internal TypeScript Object

```typescript
const context: ClaudeCodeContext = {
  attemptedApproaches: [
    "Analyzed main function flow",
    "Checked error handling patterns"
  ],
  partialFindings: [
    {
      type: "performance",
      severity: "medium",
      location: {
        file: "src/services/ApiService.ts",
        line: 145,
        functionName: "fetchData"
      },
      description: "Synchronous database call in async function",
      evidence: ["Line 145: db.query() should be await db.query()"]
    }
  ],
  stuckPoints: ["Unable to trace execution path through Promise.all() chains"],
  focusArea: {
    files: ["src/services/ApiService.ts", "src/utils/DatabaseUtil.ts"],
    entryPoints: [
      {
        file: "src/services/ApiService.ts",
        line: 42,
        functionName: "handleRequest"
      }
    ],
    serviceNames: ["ApiService", "DatabaseService"]
  },
  analysisBudgetRemaining: 60
};
```

## Common Issues and Debugging

### Parameter Format Errors

- **Issue**: `attempted_approaches is not defined`
- **Cause**: Using camelCase in external API call
- **Solution**: Use snake_case in external API: `attempted_approaches`

### Validation Failures

- **Issue**: `String contains potentially unsafe characters`
- **Cause**: Input contains `<`, `>`, `{`, or `}` characters
- **Solution**: Remove or escape special characters

### File Path Errors

- **Issue**: `Path traversal detected`
- **Cause**: File path contains `..` sequences
- **Solution**: Use absolute paths without parent directory references

## Testing the Transformation

To test parameter transformation:

```bash
# Run the input validator tests
npm test -- src/__tests__/input-validator.test.ts

# Test with real MCP tools
npm test -- src/__tests__/real-api-integration.test.ts
```

## Backward Compatibility

The transformation maintains backward compatibility by:

- Accepting both single strings and arrays for `stuckPoints`
- Providing default values for optional fields
- Gracefully handling missing or invalid data
- Warning about skipped invalid entries without failing

## Future Considerations

### Potential Improvements

1. Support both snake_case and camelCase in external API
2. Add explicit validation error messages for each field
3. Implement parameter format auto-detection
4. Add comprehensive parameter validation testing

### Migration Strategy

If parameter format changes are needed:

1. Update schemas in `input-validator.ts`
2. Update MCP tool specifications
3. Add migration tests
4. Update documentation examples
5. Validate with VS Code integration tests

---

*Last Updated: September 15, 2025*
*Version: 1.0.0*
