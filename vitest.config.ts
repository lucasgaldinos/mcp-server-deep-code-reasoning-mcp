import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Environment
    environment: 'node',
    
    // Test files
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'build'],
    
    // Global setup
    globals: true,
    
    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'config/',
        'dist/',
      ],
    },
    
    // Timeouts
    testTimeout: 15000,
    hookTimeout: 10000,
    
    // Concurrent tests
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    
    // Mock configuration for better ES module support
    clearMocks: true,
    restoreMocks: true,
    
    // Setup files
    setupFiles: ['./config/build/vitest.setup.ts'],
  },
  
  // Path resolution (same as our TypeScript config)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@analyzers': path.resolve(__dirname, './src/analyzers'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@models': path.resolve(__dirname, './src/models'),
      '@errors': path.resolve(__dirname, './src/errors'),
    },
  },
  
  // Define global types
  define: {
    'import.meta.vitest': undefined,
  },
});