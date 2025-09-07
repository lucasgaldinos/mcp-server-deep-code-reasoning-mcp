---
title: Source Code Directory
description: Main source code implementation for the Deep Code Reasoning MCP Server
status: published
updated: 2025-01-09
tags: [source, implementation, mcp-server]
---

# Source Code Directory

This directory contains the main implementation of the Deep Code Reasoning MCP Server.

## Structure

- `analyzers/` - Core analysis engines and reasoning components
- `services/` - Service layer implementations (Gemini API, conversation management)
- `utils/` - Utility functions and helper classes
- `models/` - Type definitions and data models
- `errors/` - Error handling and custom exceptions
- `__tests__/` - Unit and integration tests

## Key Components

### Analyzers

- `DeepCodeReasoner.ts` - Main reasoning engine
- `DeepCodeReasonerV2.ts` - Enhanced version with additional capabilities
- `ExecutionTracer.ts` - Execution flow analysis
- `HypothesisTester.ts` - Code hypothesis validation
- `PerformanceModeler.ts` - Performance analysis and bottleneck detection
- `SystemBoundaryAnalyzer.ts` - Cross-system impact analysis

### Services

- `GeminiService.ts` - Google Gemini API integration
- `ConversationalGeminiService.ts` - Conversational analysis with Gemini
- `ConversationManager.ts` - Multi-turn conversation management
- `HypothesisTournamentService.ts` - Hypothesis testing orchestration

### Utilities

- `CodeReader.ts` - File system abstraction for code reading
- `SecureCodeReader.ts` - Secure file access with validation
- `ErrorBoundary.ts` - Error boundary implementation
- `ErrorClassifier.ts` - Error categorization and analysis
- `InputValidator.ts` - Input validation using Zod schemas
- `Logger.ts` - Structured logging
- `PromptSanitizer.ts` - Prompt sanitization for AI interactions

## Development Guidelines

1. All new components should include comprehensive TypeScript types
2. Input validation using Zod schemas is mandatory
3. Error handling should use the centralized error system
4. Tests should be co-located in `__tests__/` directory
5. Follow the existing naming conventions and file organization

## Related Documentation

- See `/docs/` for architectural decisions and design patterns
- See `/examples/` for usage examples
- See `package.json` for build and test scripts
