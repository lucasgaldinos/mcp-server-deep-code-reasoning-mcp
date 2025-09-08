# Deep Code Reasoning MCP Server - AI Agent Instructions

## Architecture Overview

This is a **multi-model analysis orchestrator** that bridges Claude Code with Google's Gemini 2.5 Pro for complementary code analysis. Think of it as an intelligent routing system where:

- **Claude Code** handles local-context operations and incremental patches
- **Gemini 2.5 Pro** handles huge-context sweeps (1M tokens) and complex distributed system debugging

## Core Service Architecture

```text
src/index.ts         → Main MCP server with 13 analysis tools + health endpoints
src/analyzers/       → DeepCodeReasonerV2 (main orchestrator) + specialized analyzers
src/services/        → GeminiService, ConversationalGeminiService, ConversationManager
src/utils/           → ServiceContainer (DI), HealthChecker, EventBus, SecureCodeReader
                       EnvironmentValidator, JsDocGenerator, NamingConventions, ServiceFactory
src/strategies/      → ReasoningStrategy interface for analysis approach selection
src/tools/           → CLI tools for naming conventions and JSDoc analysis
```

**Key Pattern**: The `DeepCodeReasonerV2` class is the main orchestrator that coordinates between different services based on analysis type. The `ServiceContainer` provides dependency injection, while `HealthChecker` and `EventBus` handle monitoring and event-driven architecture.

## Critical Developer Patterns

### ES Modules + TypeScript Path Mapping

- **Import Rule**: Always use `.js` extensions in imports, even for TypeScript files
- **Path Aliases**: Use `@analyzers/`, `@services/`, `@utils/`, `@models/`, `@errors/` prefixes
- **Example**: `import { GeminiService } from '@services/GeminiService.js';`

### Testing with ES Modules

```bash
npm test                                    # All tests with ES module support
npm test -- --testNamePattern="specific"   # Single test pattern
NODE_OPTIONS='--experimental-vm-modules' jest  # Manual Jest with ES modules
```

### Dependency Injection Pattern

- **ServiceContainer**: Singleton-based DI container in `src/utils/ServiceContainer.ts`
- **Pattern**: Register services with `Services.register()`, access with `Services.get()`
- **Example**: Health checks, event bus, and file system abstractions are all injectable
- **ServiceFactory**: Advanced service creation with lifecycle management in `src/utils/ServiceFactory.ts`

### Error Handling Architecture

- **ErrorBoundary**: Circuit breaker pattern in `src/utils/ErrorBoundary.ts`
- **ErrorClassifier**: Categorizes errors by type in `src/utils/ErrorClassifier.ts`
- **Custom Errors**: Specialized errors in `src/errors/` (ApiError, RateLimitError, etc.)

### Code Quality and Validation

- **EnvironmentValidator**: Comprehensive environment configuration validation in `src/utils/EnvironmentValidator.ts`
- **NamingConventions**: TypeScript naming convention validation with CLI tool in `src/utils/NamingConventions.ts`
- **JsDocGenerator**: JSDoc documentation analysis and generation in `src/utils/JsDocGenerator.ts`

## Key Integration Points

### MCP Tool Structure

Each tool follows this pattern:

1. **Zod Schema Validation**: All inputs validated with Zod schemas
2. **InputValidator**: File paths and strings sanitized through `src/utils/InputValidator.ts`
3. **DeepCodeReasonerV2**: Main analysis routing through `escalateFromClaudeCode()`
4. **JSON Response**: Structured output returned to Claude

### Gemini API Integration

- **Model**: `gemini-2.5-pro-preview-06-05` with 1M token context
- **Rate Limiting**: Automatic retry logic with exponential backoff
- **Security**: Input sanitization through `PromptSanitizer.ts`
- **File Reading**: Secure file access through `SecureCodeReader.ts` with path validation

### Conversational Analysis Flow

```text
start_conversation → continue_conversation → finalize_conversation
     ↓                      ↓                      ↓
ConversationManager → ConversationalGeminiService → ConversationManager
```

## Build & Development Commands

```bash
npm run build      # TypeScript + tsc-alias for path mapping
npm run dev        # Watch mode with tsx
npm run lint       # ESLint with TypeScript rules
npm run typecheck  # Type checking without emit
```

## Environment Configuration

- **Required**: `GEMINI_API_KEY` for Google's Gemini API
- **Validation**: `EnvironmentValidator.ts` validates config on startup with detailed error messages
- **Development**: Enable debug logging with `NODE_ENV=development`

## Testing Architecture

- **Framework**: Jest with ES module preset
- **Path Mapping**: Jest moduleNameMapper mirrors TypeScript paths
- **Coverage**: Excludes `__tests__/` and `*.d.ts` files
- **Mock Strategy**: Service-level mocking through dependency injection

## Health & Monitoring

- **Health Tools**: `health_check` and `health_summary` MCP tools
- **EventBus**: Observer pattern for system events in `src/utils/EventBus.ts`
- **Monitoring**: Built-in health checks for memory, startup, and external dependencies

## Project-Specific Conventions

1. **Analysis Types**: `execution_trace`, `cross_system`, `performance`, `hypothesis_test`
2. **Context Budget**: Time-based analysis budgets (seconds) passed from Claude
3. **File Validation**: All file paths validated through `InputValidator.validateFilePaths()`
4. **Tournament Mode**: Parallel hypothesis testing through `HypothesisTournamentService`
5. **Conversation State**: Session-based analysis with conversation IDs and state management

## Security Considerations

- **Path Traversal Protection**: All file access goes through `SecureCodeReader`
- **Input Sanitization**: Prompts sanitized before sending to Gemini
- **Validation**: Comprehensive input validation with Zod + custom validators
- **API Key Management**: Environment-based configuration with validation

When modifying this codebase, always consider the multi-model orchestration pattern and ensure proper error handling through the established ErrorBoundary/ErrorClassifier system.

Whenever a new update occurs, it's absolutely necessary to check and update the documentation files located in `./.github/.copilot_intructions.md` to ensure they accurately reflect the latest code changes and architectural decisions. This helps maintain clarity and consistency for all future developers interacting with the codebase.
