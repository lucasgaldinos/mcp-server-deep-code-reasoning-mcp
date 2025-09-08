/**
 * Jest setup file for ES Modules compatibility
 */

// Set up any global mocks or configurations
// Jest is already available in the test environment, so no need to define it globally

// Optional: restore console after tests if needed
afterEach(() => {
  if (typeof jest !== 'undefined') {
    jest.clearAllMocks();
  }
});
