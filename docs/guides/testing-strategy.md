# Testing Strategy Guide - Hybrid Testing Approach

## **Overview** 📋

This guide documents our **hybrid testing strategy** that combines the speed of mock testing with the confidence of real API integration testing. This approach addresses both development velocity and production reliability concerns.

## **Testing Philosophy** 🎯

### **The Problem We Solve**

**Mock-Only Testing Issues:**

- ❌ No real API integration validation
- ❌ Mock responses may drift from real API behavior  
- ❌ Missing network error scenarios and rate limiting
- ❌ False confidence - tests pass but production fails

**Real-API-Only Testing Issues:**  

- ❌ Slow test execution
- ❌ Expensive API costs
- ❌ Flaky tests due to network issues
- ❌ Requires API keys in CI/CD

### **Our Hybrid Solution**

✅ **Fast mock tests** for development velocity  
✅ **Real API tests** for integration confidence  
✅ **Environment-based execution** for flexibility  
✅ **Cost-effective** strategic API usage

## **Testing Strategies** 🚀

### **1. Mock Unit Tests (Fast & Reliable)**

**Purpose**: Test business logic, error handling, and parsing without external dependencies.

**When to Use**:

- Daily development and debugging
- CI/CD pull request checks  
- Local development workflow
- Regression testing

**Example**:

```bash
# Fast development testing (~5 seconds)
npm run test:unit
```

**Configuration**:

```typescript
// Mock tests run by default
describe('🎭 Mock Unit Tests (Fast & Reliable)', () => {
  // Test business logic with predictable mock responses
  // No network calls, no API costs, fast execution
});
```

### **2. Real API Integration Tests (High Confidence)**

**Purpose**: Validate actual API integration, network handling, and real-world scenarios.

**When to Use**:

- Before releases and deployments
- Nightly builds and comprehensive testing
- Contract validation after API updates
- Investigation of production issues

**Example**:

```bash
# Full confidence testing (requires API key)
export TEST_WITH_REAL_API=true
export GEMINI_API_KEY_TEST=your_test_api_key
npm run test:integration
```

**Configuration**:

```typescript
// Real API tests run conditionally
if (useRealAPI && hasTestAPIKey) {
  describe('🌐 Real API Integration Tests', () => {
    // Test actual network calls, timeouts, authentication
    // Uses cheaper model (gemini-1.5-flash) for cost control
  });
}
```

### **3. Hybrid Execution (Best of Both)**

**Purpose**: Run both mock and real API tests strategically based on context.

**Example**:

```bash
# Complete testing strategy
npm run test:all  # Runs both mock and real API tests
```

## **NPM Scripts Reference** 📜

### **Core Testing Commands**

```json
{
  "test": "jest --passWithNoTests",
  "test:unit": "jest --testNamePattern='Mock Tests|Unit Tests'",
  "test:integration": "TEST_WITH_REAL_API=true jest --testNamePattern='Real API|Integration Tests'", 
  "test:hybrid": "jest --testPathPattern='hybrid'",
  "test:all": "npm run test:unit && npm run test:integration",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

### **Development Workflow**

```bash
# Daily development (fast feedback)
npm run test:unit

# Pre-commit validation  
npm run test:unit

# Release preparation
npm run test:all

# Debugging specific issues
npm run test:hybrid
npm run test:watch
```

## **Environment Configuration** ⚙️

### **Required Environment Variables**

**For Real API Testing:**

```bash
# Enable real API integration tests
export TEST_WITH_REAL_API=true

# Test API key (use cheaper/test-specific key)
export GEMINI_API_KEY_TEST=your_gemini_test_api_key
```

### **Cost Management**

**Recommended API Key Setup:**

- **Development**: Use mock tests only (no API key needed)
- **CI/CD**: Fast mock tests for PR checks
- **Integration**: Separate test API key with usage limits
- **Production**: Different API key with appropriate quotas

**Cost-Effective Practices:**

```typescript
// Use cheaper model for testing
const testConfig = {
  model: 'gemini-1.5-flash',  // Cheaper than gemini-2.5-pro
  timeout: 10000,             // Reasonable timeout
  maxRetries: 2               // Limited retries
};
```

## **CI/CD Integration Patterns** 🔄

### **Multi-Stage Testing Strategy**

**Stage 1: Fast PR Validation**

```yaml
# Pull Request Checks
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Fast Unit Tests
        run: npm run test:unit
```

**Stage 2: Nightly Integration**

```yaml
# Nightly Build with Real API
jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
      - name: Integration Tests
        env:
          TEST_WITH_REAL_API: true
          GEMINI_API_KEY_TEST: ${{ secrets.GEMINI_TEST_KEY }}
        run: npm run test:integration
```

**Stage 3: Release Validation**

```yaml
# Release Pipeline
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Complete Testing
        env:
          TEST_WITH_REAL_API: true
          GEMINI_API_KEY_TEST: ${{ secrets.GEMINI_TEST_KEY }}
        run: npm run test:all
```

## **Test Implementation Patterns** 🔧

### **Hybrid Test Structure**

```typescript
describe('ServiceName - Hybrid Testing Strategy', () => {
  const useRealAPI = process.env.TEST_WITH_REAL_API === 'true';
  const hasTestAPIKey = !!process.env.GEMINI_API_KEY_TEST;
  
  // Real API Tests (conditional)
  if (useRealAPI && hasTestAPIKey) {
    describe('🌐 Real API Integration Tests', () => {
      // Actual API calls with proper timeouts
      // Test authentication, rate limiting, real errors
      // Use cheaper models and realistic timeouts
    });
  } else {
    console.log('⏭️  Skipping real API tests. To enable:');
    console.log('   export TEST_WITH_REAL_API=true');  
    console.log('   export GEMINI_API_KEY_TEST=your_test_key');
  }
  
  // Mock Tests (always run)
  describe('🎭 Mock Unit Tests (Fast & Reliable)', () => {
    // Fast, predictable tests with mocked dependencies
    // Test business logic, error handling, edge cases
    // No external dependencies or costs
  });
  
  // Validation Tests
  describe('🧪 Test Strategy Validation', () => {
    // Ensure mock responses match real API format
    // Validate test consistency and reliability
  });
});
```

### **Mock Configuration Best Practices**

```typescript
// Proper mock setup that matches real API responses
const mockResponse = {
  text: jest.fn().mockReturnValue(JSON.stringify({
    // Match actual API response structure
    status: 'success',
    rootCauses: [...],
    executionPaths: [...],
    // Ensure format consistency with real API
  }))
};
```

### **Real API Test Configuration**

```typescript
// Cost-effective real API testing
beforeAll(() => {
  service = new GeminiService(process.env.GEMINI_API_KEY_TEST!, undefined, {
    model: 'gemini-1.5-flash',  // Cheaper model
    timeout: 15000,             // Reasonable timeout
    maxRetries: 2               // Limited retries
  });
});

afterEach(async () => {
  // Respect rate limits
  await new Promise(resolve => setTimeout(resolve, 1000));
});
```

## **Troubleshooting Guide** 🔍

### **Common Issues**

**Mock Tests Failing:**

- Check mock response format matches real API structure
- Verify Jest configuration and imports
- Ensure proper cleanup in afterEach hooks

**Real API Tests Skipped:**

- Verify environment variables are set correctly
- Check API key validity and permissions
- Confirm network connectivity

**Tests Hanging:**

- Add proper cleanup for async operations
- Use `--detectOpenHandles` flag to identify leaks
- Implement timeout strategies

### **Debug Commands**

```bash
# Identify hanging processes
npm test -- --detectOpenHandles

# Debug specific test patterns
npm test -- --testNamePattern="specific test"

# Verbose output for debugging
npm test -- --verbose

# Run with coverage analysis
npm run test:coverage
```

## **Best Practices** ✅

### **Development Workflow**

1. **Start with mock tests** for rapid development
2. **Use real API tests** for confidence before releases
3. **Monitor API costs** and usage patterns
4. **Implement proper timeouts** and error handling
5. **Maintain mock/real API format consistency**

### **Team Guidelines**

- **Default to mock tests** for daily development
- **Require real API tests** for release pipeline
- **Document API changes** that affect test structure
- **Monitor test execution times** and optimize accordingly
- **Use environment-specific API keys** for different contexts

### **Quality Gates**

```bash
# Pre-commit: Fast validation
npm run test:unit

# Pre-push: Additional checks  
npm run test:unit && npm run lint

# Release: Complete validation
npm run test:all && npm run quality:full
```

## **Performance Metrics** 📊

### **Expected Performance**

- **Mock Tests**: < 5 seconds for full suite
- **Real API Tests**: 30-60 seconds depending on scope  
- **Hybrid Tests**: Variable based on configuration
- **Coverage**: Target 80%+ with both approaches

### **Cost Estimates**

- **Mock Tests**: $0 (no API calls)
- **Real API Tests**: ~$0.01-0.10 per test run (depending on scope)
- **Nightly Integration**: ~$1-5 per month (estimated)
- **Release Pipeline**: Minimal additional cost

## **Migration Guide** 🔄

### **From Mock-Only to Hybrid**

1. **Keep existing mock tests** as-is
2. **Add conditional real API tests** for critical paths
3. **Update package.json scripts** with new commands
4. **Configure environment variables** for different contexts
5. **Update CI/CD pipelines** with staged testing

### **From Real-API-Only to Hybrid**

1. **Create mock versions** of expensive tests
2. **Use real API tests** selectively for integration
3. **Implement cost controls** with timeouts and retries
4. **Add environment-based execution** logic
5. **Monitor and optimize** API usage patterns

---

This hybrid testing strategy provides the **best of both worlds**: fast development feedback through mocks and high confidence through real API integration testing, while maintaining cost-effectiveness and reliability.
