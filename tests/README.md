---
title: Tests Directory
description: Test suite for the Deep Code Reasoning MCP Server
status: published
updated: 2025-01-09
tags: [tests, testing, quality-assurance]
---

# Tests Directory

This directory contains the complete test suite for the Deep Code Reasoning MCP Server, organized by test type and scope.

## Directory Structure

### Unit Tests

Located in `src/__tests__/` - Co-located with source code for immediate feedback during development.

- Component-level tests
- Service-level tests  
- Utility function tests
- Isolated behavior validation

### Integration Tests (`integration/`)

End-to-end and integration tests that verify component interactions.

- Server startup and MCP protocol tests
- Gemini API integration tests
- Conversation flow tests
- Multi-service interaction tests

### Fixtures (`fixtures/`)

Test data, mock services, and reusable test components.

- Mock code scenarios
- Sample analysis data
- Test configuration files
- Reusable test utilities

## Test Categories

### Current Test Files

#### Integration Tests

- `quick-test.js` - Basic server functionality validation
- Additional integration tests (check `integration/` directory)

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
