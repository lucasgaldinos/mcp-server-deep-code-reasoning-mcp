module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    'prefer-const': 'error',
    'no-var': 'error',
    curly: 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-undef': 'error',
    'no-useless-escape': 'error',
    'no-fallthrough': 'error',
    'no-case-declarations': 'error',
    'no-async-promise-executor': 'error',
    eqeqeq: ['error', 'always', { null: 'ignore' }],
  },
  env: {
    node: true,
    es2020: true,
  },
  globals: {
    NodeJS: 'readonly',
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.js', '**/*.test.ts', '**/*.test.js'],
      env: {
        jest: true,
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        jest: 'readonly',
      },
    },
    {
      files: ['src/tools/**/*.ts', 'src/**/*-cli.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
  ignorePatterns: [
    'dist/',
    'build/',
    'node_modules/',
    '*.d.ts',
    'config/',
    'src/__tests__/disabled/',
  ],
  root: true,
};
