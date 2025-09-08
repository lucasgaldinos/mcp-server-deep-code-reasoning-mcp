---
title: Examples Directory
description: Usage examples and demonstration code for the Deep Code Rea3. **Available MCP Tools** in Claude:
   - `start_conversation` - Begin AI-to-AI analysis dialogue
   - `continue_conversation` - Continue multi-turn analysis
   - `finalize_conversation` - Complete analysis with structured results
   - `analyze_execution_trace` - Trace code execution paths
   - `analyze_cross_system_impact` - Assess system-wide effects
   - `test_hypothesis_tournament` - Parallel hypothesis testing
   - And 7 more specialized analysis tools

## Architecture Notes

- **Multi-Model Orchestration**: Claude handles local context, Gemini provides 1M token deep analysis
- **Session Management**: Persistent conversation state for complex analysis flows
- **Type Safety**: Full TypeScript implementation with comprehensive error handling
- **Memory Management**: ABSOLUTE-RULE compliant with systematic memory tracking
- **Production Ready**: Complete testing suite, monitoring, and documentation

## Contributing Examples

When adding new examples:

1. Include clear documentation and comments
2. Add appropriate error handling
3. Use realistic code scenarios
4. Include expected outputs or results
5. Follow TypeScript best practices

## Related Documentation

- See `docs/API_DOCUMENTATION.md` for complete API reference
- See `docs/ARCHITECTURE_GUIDE.md` for architectural guidance
- See main `README.md` for setup instructionsCP Server
status: published
updated: 2025-01-09
tags: [examples, demonstrations, usage, mock-demo, standalone-demo]
---

# Deep Code Reasoning MCP Server Examples

This directory contains examples demonstrating the capabilities of the Deep Code Reasoning MCP Server.

## Available Examples

### 1. `conversational-analysis.ts` - MCP Tool Integration Examples ⚠️ Requires MCP Context

**Purpose**: Demonstrates how the MCP tools would be used within Claude's context
**Status**: Demonstration code showing MCP tool patterns
**Note**: This is template code showing how `mcp.startConversation()` and other MCP tools work

### 2. `performance-issue.ts` - Sample Code for Analysis

**Purpose**: Provides sample problematic code (N+1 queries, memory leaks) for analysis
**Status**: Complete sample code  
**Usage**: Referenced by analysis tools as test data

### 3. `standalone-demo.ts` - Real API Integration Demo ⚡ Requires Paid API

**Purpose**: Demonstrates actual service integration with Gemini API
**Status**: Functional but requires paid Gemini API access
**Requirements**:

- Paid Gemini API key in `.env`
- `npm run build` completed

### 4. `mock-demo.ts` - Architecture Demonstration ✅ Works Without API

**Purpose**: Shows expected outputs and service architecture without API calls
**Status**: Fully functional mock demonstration
**Usage**: `npx tsx examples/mock-demo.ts`

## Running the Examples

### Prerequisites

```bash
# Build the project
npm run build

# Ensure environment is configured
cp .env.example .env
# Edit .env with your API keys (for standalone-demo only)
```

### Execute Examples

#### Mock Demo (Recommended - No API Required)

```bash
npx tsx examples/mock-demo.ts
```

Shows complete architecture demonstration with mock data.

#### Standalone Demo (Requires Paid API)

```bash
npx tsx examples/standalone-demo.ts
```

Runs actual analysis with Gemini API integration.

#### View Sample Code

```bash
cat examples/performance-issue.ts
```

Shows N+1 query patterns and performance issues for analysis.

## Example Outputs

The mock demo demonstrates:

- **Service Architecture**: Multi-model AI orchestration (Claude + Gemini)
- **Analysis Types**: Performance bottleneck detection, root cause analysis
- **Conversational Flow**: Multi-turn AI dialogue for deep code reasoning
- **Structured Results**: Confidence scores, cross-system impact analysis
- **Recommendations**: Prioritized action items with effort estimates

## Integration with Claude Desktop

To use as an MCP server with Claude Desktop:

1. **Build the server**:
   ```bash
   npm run build
   ```

2. **Configure Claude Desktop** (`claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "deep-code-reasoning": {
         "command": "node",
         "args": ["dist/index.js"],
         "cwd": "/path/to/mcp-server-deep-code-reasoning-mcp",
         "env": {
           "GEMINI_API_KEY": "your-api-key-here"
         }
       }
     }
   }
   ```

3. **Available MCP Tools** in Claude:
   - `start_conversation` - Begin AI-to-AI analysis dialogue
   - `continue_conversation` - Continue multi-turn analysis
   - `finalize_conversation` - Complete analysis with structured results
   - `analyze_execution_trace` - Trace code execution paths
   - `analyze_cross_system_impact` - Assess system-wide effects
   - `test_hypothesis_tournament` - Parallel hypothesis testing
   - And 7 more specialized analysis tools
   ```bash
   npx tsx examples/conversational-analysis.ts
   npx tsx examples/performance-issue.ts
   ```

## Example Categories

- **Analysis Patterns**: Different approaches to code analysis
- **Integration Examples**: How to integrate with various IDEs and workflows
- **Performance Scenarios**: Common performance analysis patterns
- **Debugging Workflows**: Step-by-step debugging approaches

## Contributing Examples

When adding new examples:

1. Include clear documentation and comments
2. Add appropriate error handling
3. Use realistic code scenarios
4. Include expected outputs or results
5. Follow TypeScript best practices

## Related Documentation

- See `/src/` for implementation details
- See `/docs/` for architectural guidance
- See main `README.md` for setup instructions
