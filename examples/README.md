---
title: Examples Directory
description: Usage examples and demonstration code for the Deep Code Reasoning MCP Server
status: published
updated: 2025-01-09
tags: [examples, demonstrations, usage]
---

# Examples Directory

This directory contains practical examples demonstrating how to use the Deep Code Reasoning MCP Server for various analysis scenarios.

## Available Examples

### conversational-analysis.ts

Demonstrates how to set up and use the conversational analysis feature where Claude and Gemini engage in multi-turn dialogues for complex problem-solving.

**Use Cases:**

- Complex debugging scenarios requiring multiple perspectives
- Architectural analysis requiring back-and-forth discussion
- Performance optimization requiring iterative hypothesis testing

### performance-issue.ts

Shows how to analyze performance bottlenecks and optimization opportunities in codebases.

**Use Cases:**

- Identifying N+1 query patterns
- Memory leak detection
- Algorithmic complexity analysis
- Resource utilization optimization

## Running Examples

1. Ensure the MCP server is built and configured:
   ```bash
   npm run build
   ```

2. Set up your environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your GEMINI_API_KEY
   ```

3. Run examples using tsx:
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
