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
src/testing/         → TestSuiteRunner, PerformanceBenchmark, QualityAssurance, IntegrationTestFramework
```

**Key Pattern**: The `DeepCodeReasonerV2` class is the main orchestrator that coordinates between different services based on analysis type. The `ServiceContainer` provides dependency injection, while `HealthChecker` and `EventBus` handle monitoring and event-driven architecture. The `src/testing/` directory contains comprehensive testing and quality infrastructure for development workflow.

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
- **Testing Infrastructure**: Comprehensive Phase 4 testing system
  - **TestSuiteRunner**: Unit, integration, and performance test coordination (338 lines)
  - **PerformanceBenchmark**: Advanced benchmarking with memory/CPU monitoring (481 lines)
  - **QualityAssurance**: Quality metrics with coverage/security analysis (707 lines)
  - **IntegrationTestFramework**: End-to-end testing with scenario management (412 lines)

## Health & Monitoring

- **Health Tools**: `health_check` and `health_summary` MCP tools
- **EventBus**: Observer pattern for system events in `src/utils/EventBus.ts`
- **Monitoring**: Built-in health checks for memory, startup, and external dependencies
- **Testing Pipeline**: Automated quality gates with configurable thresholds
- **Performance Tracking**: Real-time benchmarking with statistical analysis and memory leak detection

## Project-Specific Conventions

1. **Analysis Types**: `execution_trace`, `cross_system`, `performance`, `hypothesis_test`
2. **Context Budget**: Time-based analysis budgets (seconds) passed from Claude
3. **File Validation**: All file paths validated through `InputValidator.validateFilePaths()`
4. **Tournament Mode**: Parallel hypothesis testing through `HypothesisTournamentService`
5. **Conversation State**: Session-based analysis with conversation IDs and state management

## Memory Management Protocol ✅ IMPLEMENTED

### ABSOLUTE-RULE Compliance

The memory management protocol has been fully implemented to ensure ABSOLUTE-RULE compliance:

- **Systematic Memory Tracking**: Implemented `MemoryManagementProtocol.ts` with comprehensive memory tracking
- **Checkpoint System**: Automatic memory checkpoints every 10 thoughts with entity classification
- **Health Integration**: Memory graph validation integrated with health check system
- **MCP Tool Integration**: Hooks for MCP memory tool integration with `getPersistenceData()` method
- **Entity Management**: Automatic entity creation, observation tracking, and relation mapping
- **Memory Graph Validation**: Continuous validation of memory graph integrity

### Memory Protocol Components

```text
src/utils/MemoryManagementProtocol.ts  → Core memory management system (490 lines)
                                       → Includes checkpoint system, entity management, and graph validation
                                       → All memory functionality consolidated in single comprehensive file
```

### Integration Points

- **Health Check System**: Memory graph validation integrated with `HealthChecker`
- **EventBus Integration**: Memory events published through event system
- **ServiceContainer**: Memory protocol registered as injectable service
- **Main Application**: Memory protocol initialized in `src/index.ts`

### Usage Patterns

- **Thought Tracking**: Automatic thought counting with 10-thought checkpoint intervals
- **Entity Classification**: Automatic classification of entities by type and importance
- **Memory Persistence**: Integration with MCP memory tools for persistent storage
- **Context Preservation**: Memory-based context preservation across conversation boundaries

## Development Phase Status

**Current Status**: ALL 5 PHASES ✅ COMPLETED | PRODUCTION READY 🚀

### Phase 1-5: Complete Development Lifecycle ✅ COMPLETED

- **Phase 1 - Foundation and Core Architecture**: MCP server foundation with 13 tools ✅
- **Phase 2 - Advanced Patterns and Architecture**: Service-oriented patterns with DI ✅
- **Phase 3 - Performance and Caching**: Performance optimization and monitoring ✅
- **Phase 4 - Testing and Quality Infrastructure**: Comprehensive testing framework ✅
- **Phase 5 - Documentation and Integration**: Complete documentation suite ✅

### Complete Documentation Suite ✅ IMPLEMENTED

- **API Documentation**: Complete reference for all 13 MCP tools → `docs/API_DOCUMENTATION.md` (400+ lines)
- **Integration Guide**: Comprehensive deployment guide → `docs/INTEGRATION_GUIDE.md` (800+ lines)
- **Architecture Guide**: Complete system architecture → `docs/ARCHITECTURE_GUIDE.md` (750+ lines)
- **Performance Guide**: Optimization and monitoring → `docs/PERFORMANCE_GUIDE.md` (650+ lines)

### Development Phase Status ✅ COMPLETED

**Current Status**: ALL 7 PHASES ✅ COMPLETED | PRODUCTION READY 🚀

- **Phase 1 - Foundation and Core Architecture**: MCP server foundation with 13 tools ✅
- **Phase 2 - Advanced Patterns and Architecture**: Service-oriented patterns with DI ✅
- **Phase 3 - Performance and Caching**: Performance optimization and monitoring ✅
- **Phase 4 - Testing and Quality Infrastructure**: Comprehensive testing framework ✅
- **Phase 5 - Documentation and Integration**: Complete documentation suite ✅
- **Phase 6 - Enterprise Integration**: Security audit framework and performance optimization ✅
- **Phase 7 - AI Model Enhancement**: Multi-model orchestration and specialized AI agents ✅

### Future MCP Server Enhancements 🚧 PLANNED

- **New MCP Tools**: Code refactoring suggestions, test generation, documentation analysis
- **Analysis Improvements**: Enhanced prompting, better context handling, multi-model validation
- **VS Code Integration**: Improved progress indicators, rich formatting, workspace awareness
- **Performance Optimization**: Analysis caching, incremental processing, memory optimization

### Critical Implementation Gaps ⚠️ ATTENTION REQUIRED

- **Memory Management Protocol**: ABSOLUTE-RULE compliance requiring systematic memory tracking ✅ **COMPLETED**
- **Security Audit**: Comprehensive security review of complete system architecture
- **Performance Baselines**: Establish benchmarks for regression detection
- **CI/CD Automation**: Missing production deployment pipelines with quality gates

Whenever a new update occurs, it's absolutely necessary to check and update the documentation files located in `./.github/.copilot_intructions.md` to ensure they accurately reflect the latest code changes and architectural decisions. This helps maintain clarity and consistency for all future developers interacting with the codebase.

# Important

**Use timeout with npm, npx and similar**
