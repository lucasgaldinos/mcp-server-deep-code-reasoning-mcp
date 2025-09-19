# Unit Tests

This directory contains unit tests co-located with the source code for immediate feedback during development.

## Purpose

The `src/__tests__/` directory follows Jest/Vitest conventions for co-locating tests with source code. This approach provides:

- **Immediate Feedback**: Tests are close to the code they test
- **Easy Discovery**: Test files are automatically discovered by test runners
- **Component Isolation**: Each test focuses on individual component behavior
- **Fast Execution**: Unit tests run quickly with minimal dependencies

## Test Organization

### File Naming Convention

All test files follow the pattern: `ComponentName.test.ts`

Examples:

- `GeminiService.test.ts` - Tests for the Gemini API service
- `ConversationManager.test.ts` - Tests for conversation management
- `MemoryManager.test.ts` - Tests for memory management functionality

### Directory Structure

```
src/__tests__/
├── __mocks__/                    # Mock implementations
│   ├── @google/                  # External service mocks
│   └── fs.js                     # File system mocks
├── disabled/                     # Temporarily disabled tests
├── ComponentName.test.ts         # Individual component tests
└── integration-*.test.ts         # Multi-component integration tests
```

## Test Categories

### Component Tests

Individual component behavior testing:

- **Service Tests**: API services, data services, external integrations
- **Utility Tests**: Helper functions, validators, formatters
- **Manager Tests**: State managers, configuration managers
- **Analyzer Tests**: Code analysis components

### Integration Tests

Multi-component interaction testing:

- **Workflow Tests**: Complete analysis workflows
- **Service Integration**: Multiple services working together
- **Race Condition Tests**: Concurrent access patterns
- **Error Handling**: Cross-component error propagation

## Testing Patterns

### Service Testing Pattern

```typescript
// Example: GeminiService.test.ts
import { GeminiService } from '../services/gemini-service.js';
import { mockGeminiAPI } from './__mocks__/@google/generative-ai.js';

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(() => {
    service = new GeminiService('test-api-key');
    vi.clearAllMocks();
  });

  it('should analyze code successfully', async () => {
    // Arrange: Set up test data and mocks
    const mockContext = { /* test context */ };
    mockGeminiAPI.mockResolvedValue({ result: 'analysis' });

    // Act: Execute the functionality
    const result = await service.analyze(mockContext);

    // Assert: Verify the expected behavior
    expect(result).toBe('analysis');
    expect(mockGeminiAPI).toHaveBeenCalledWith(mockContext);
  });
});
```

### Manager Testing Pattern

```typescript
// Example: ConversationManager.test.ts
import { ConversationManager } from '../services/conversation-manager.js';

describe('ConversationManager', () => {
  let manager: ConversationManager;

  beforeEach(() => {
    manager = new ConversationManager();
  });

  it('should create new conversation session', async () => {
    const sessionId = await manager.startSession('test-context');
    expect(sessionId).toBeDefined();
    expect(manager.hasActiveSession(sessionId)).toBe(true);
  });

  it('should handle concurrent session creation', async () => {
    // Test race conditions and concurrent access
    const promises = Array(10).fill(0).map(() => 
      manager.startSession('concurrent-test')
    );
    
    const sessions = await Promise.all(promises);
    const uniqueSessions = new Set(sessions);
    expect(uniqueSessions.size).toBe(10);
  });
});
```

### Race Condition Testing Pattern

```typescript
// Example: race-condition.test.ts
describe('Race Condition Prevention', () => {
  it('should prevent concurrent access to the same session', async () => {
    const sessionId = 'test-session';
    
    // Start multiple concurrent operations
    const operations = Array(5).fill(0).map(() => 
      conversationManager.acquireSessionLock(sessionId)
    );
    
    const results = await Promise.allSettled(operations);
    const successful = results.filter(r => r.status === 'fulfilled');
    
    // Only one should succeed
    expect(successful.length).toBe(1);
  });
});
```

## Mock Strategy

### External Service Mocking

All external services are mocked to ensure:

- **Test Isolation**: Tests don't depend on external systems
- **Consistent Results**: Predictable test outcomes
- **Fast Execution**: No network calls or external dependencies

### Mock Implementations

Located in `__mocks__/` subdirectory:

- `@google/generative-ai.js` - Mocks Google Gemini API
- `fs.js` - Mocks file system operations
- Service-specific mocks for complex components

### Mock Usage Example

```typescript
// __mocks__/@google/generative-ai.js
export const mockGenerateContent = vi.fn();
export const GoogleGenerativeAI = vi.fn(() => ({
  getGenerativeModel: () => ({
    generateContent: mockGenerateContent
  })
}));

// In test files
import { mockGenerateContent } from './__mocks__/@google/generative-ai.js';

// Configure mock behavior
mockGenerateContent.mockResolvedValue({
  response: { text: () => 'mocked response' }
});
```

## Test Configuration

### Vitest Configuration

Tests use Vitest with ES module support:

```typescript
// config/build/vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@analyzers': path.resolve(__dirname, '../../src/analyzers'),
      '@services': path.resolve(__dirname, '../../src/services'),
      // ... other aliases
    }
  }
});
```

### Test Setup

Global test setup in `vitest.setup.ts`:

```typescript
// Common test utilities and global mocks
import { vi } from 'vitest';

// Global mock setup
vi.mock('@google/generative-ai');
vi.mock('fs/promises');

// Test utilities available globally
global.createMockContext = () => ({ /* mock context */ });
```

## Running Tests

### Basic Test Execution

```bash
# Run all unit tests
npm test

# Run specific test file
npm test -- ConversationManager.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="race condition"

# Run tests with coverage
npm test -- --coverage
```

### Watch Mode

```bash
# Run tests in watch mode during development
npm test -- --watch

# Run specific tests in watch mode
npm test -- --watch ConversationManager.test.ts
```

### Debug Mode

```bash
# Run tests with debugging output
DEBUG=* npm test

# Run tests with Node.js debugging
node --inspect-brk node_modules/.bin/vitest --no-coverage
```

## Best Practices

### Test Structure

1. **Arrange-Act-Assert**: Clear test structure
2. **Descriptive Names**: Test names explain what is being tested
3. **Single Responsibility**: Each test focuses on one behavior
4. **Independent Tests**: Tests don't depend on each other

### Mock Guidelines

1. **Mock External Dependencies**: Always mock external services
2. **Realistic Mocks**: Mocks should behave like real services
3. **Clear Mock Setup**: Make mock behavior explicit
4. **Reset Mocks**: Clean up mocks between tests

### Performance Guidelines

1. **Fast Tests**: Unit tests should run quickly (< 1s each)
2. **Minimal Setup**: Avoid heavy setup in unit tests
3. **Parallel Execution**: Tests should be parallelizable
4. **Resource Cleanup**: Clean up resources after tests

## Common Patterns

### Testing Async Operations

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Error Conditions

```typescript
it('should handle errors gracefully', async () => {
  mockService.mockRejectedValue(new Error('Test error'));
  
  await expect(serviceCall()).rejects.toThrow('Test error');
});
```

### Testing Timeouts

```typescript
it('should timeout after specified time', async () => {
  vi.useFakeTimers();
  
  const promise = serviceWithTimeout();
  vi.advanceTimersByTime(5000);
  
  await expect(promise).rejects.toThrow('Timeout');
  vi.useRealTimers();
});
```

## Disabled Tests

Tests in the `disabled/` subdirectory are temporarily disabled, usually due to:

- **Refactoring in Progress**: Tests need updates for code changes
- **External Dependencies**: Tests require unavailable external services
- **Performance Issues**: Tests take too long or use too many resources
- **Experimental Features**: Tests for features under development

These tests should be regularly reviewed and either fixed or removed.

## Quality Standards

### Coverage Requirements

- **Minimum Coverage**: 80% line coverage for unit tests
- **Branch Coverage**: Test both success and error paths
- **Critical Path Coverage**: 100% coverage for critical functionality

### Test Quality Metrics

- **Test Maintainability**: Tests should be easy to understand and modify
- **Test Reliability**: Tests should pass consistently
- **Test Speed**: Unit tests should complete quickly
- **Test Isolation**: Tests should not affect each other

This unit testing approach ensures comprehensive coverage while maintaining fast feedback cycles during development.
