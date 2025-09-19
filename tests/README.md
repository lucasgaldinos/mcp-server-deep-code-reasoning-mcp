# Testing Architecture for Deep Code Reasoning MCP

This document explains the comprehensive testing strategy used in the Deep Code Reasoning MCP server project.

## Testing Directory Structure

### Overview

The project employs a three-tier testing architecture designed to separate concerns and provide comprehensive coverage:

```
src/
├── __tests__/           # Unit tests co-located with source code
├── testing/             # Testing infrastructure and frameworks
tests/
├── fixtures/            # Test data and scenarios
```

## Testing Directories Explained

### 1. `src/__tests__/` - Unit Tests

**Purpose**: Co-located unit tests that test individual components in isolation.

**Contents**:

- Component-specific test files (e.g., `GeminiService.test.ts`)
- Mock implementations in `__mocks__/` subdirectory
- Integration tests that test multiple components together
- Race condition and concurrency tests

**Testing Approach**:

- Jest/Vitest framework with ES module support
- Component isolation using dependency injection
- Mock external services (Gemini API, file system)
- Focus on business logic and component behavior

**Examples**:

- `ConversationManager.test.ts` - Tests conversation session management
- `GeminiService.test.ts` - Tests Gemini API integration with mocking
- `race-condition.test.ts` - Tests concurrent access patterns

### 2. `src/testing/` - Testing Infrastructure

**Purpose**: Testing frameworks, utilities, and infrastructure that support the testing process.

**Contents**:

- `integration-test-framework.ts` - Framework for end-to-end testing
- `performance-benchmark.ts` - Performance testing and benchmarking tools
- `quality-assurance.ts` - Code quality validation tools
- `test-suite-runner.ts` - Orchestrates test execution across different types

**Key Features**:

- **Integration Test Framework**: Provides tools for testing complete workflows
- **Performance Benchmarking**: Memory usage, execution time, and resource monitoring
- **Quality Assurance**: Code coverage, complexity analysis, and quality metrics
- **Test Suite Runner**: Coordinates unit, integration, and performance tests

**Not Tests Themselves**: These are tools and frameworks that support testing, not test cases.

### 3. `tests/` - Integration Tests and Fixtures

**Purpose**: High-level integration tests, test scenarios, and shared test data.

**Contents**:

- `fixtures/` - Test data, mock scenarios, and sample code
- Integration test files for complete system testing
- End-to-end test scenarios
- Performance test data and baselines

**Testing Approach**:

- Tests complete user workflows
- Uses real or realistic test data from fixtures
- May use external services in controlled environments
- Focuses on system behavior and integration points

#### Test Fixtures

- `test-scenario/` - Sample codebase for testing analysis features

## Running Tests

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
# Run integration tests with real API
npm run test:integration

# Run all tests (unit + integration)
npm run test:all
```

### Watch Mode

```bash
npm run test:watch  # (if configured)
```

## Test Configuration

Tests are configured using:

- **Jest**: Primary test runner (see `jest.config.js`)
- **TypeScript**: Type-safe test development
- **Environment Variables**: Test-specific configurations

## Test Guidelines

### Writing Tests

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions and workflows
3. **Use TypeScript**: All tests should be type-safe
4. **Descriptive Names**: Use clear, descriptive test names
5. **Arrange-Act-Assert**: Follow the AAA pattern

### Test Organization

- Keep unit tests close to source code (`src/__tests__/`)
- Use vitest for all test execution (`npm test`, `npm run test:integration`)
- Store test data and fixtures in `tests/fixtures/`
- Group related tests in describe blocks

### Best Practices

- Test both success and error paths
- Use meaningful test data
- Mock external dependencies appropriately
- Ensure tests are deterministic and fast
- Write tests before implementing features (TDD)

## Continuous Integration

Tests are run automatically in CI/CD pipeline:

- All tests must pass before merging
- Coverage reports are generated
- Integration tests validate end-to-end functionality

## Debugging Tests

For debugging failing tests:

1. Run tests in verbose mode: `npm test -- --verbose`
2. Use Node.js debugging: `node --inspect-brk node_modules/.bin/jest`
3. Check test logs and error messages
4. Verify environment setup and dependencies

## Related Documentation

- See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines
- See [src/README.md](../src/README.md) for source code organization
- See Jest documentation for testing framework details
