import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnvironmentValidator, type IEnvironmentConfig, type IValidationResult } from '../utils/environment-validator.js';

describe('EnvironmentValidator', () => {
  // Store original environment variables
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('validate', () => {
    it('should fail validation when required variables are missing', () => {
      // Remove required environment variable
      delete process.env.GEMINI_API_KEY;

      const result = EnvironmentValidator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Required environment variable GEMINI_API_KEY is not set');
      expect(result.config).toBeNull();
    });

    it('should pass validation with valid required variables', () => {
      process.env.GEMINI_API_KEY = 'valid-api-key-12345';

      const result = EnvironmentValidator.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.config).not.toBeNull();
      expect(result.config?.geminiApiKey).toBe('valid-api-key-12345');
    });

    it('should detect placeholder API key', () => {
      process.env.GEMINI_API_KEY = 'your-gemini-api-key-here';

      const result = EnvironmentValidator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('GEMINI_API_KEY appears to be a placeholder or invalid');
    });

    it('should detect short API key', () => {
      process.env.GEMINI_API_KEY = 'short';

      const result = EnvironmentValidator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('GEMINI_API_KEY appears to be a placeholder or invalid');
    });

    it('should validate numeric ranges', () => {
      process.env.GEMINI_API_KEY = 'valid-api-key-12345';
      process.env.GEMINI_TEMPERATURE = '3.0'; // Invalid range
      process.env.GEMINI_TOP_P = '1.5'; // Invalid range
      process.env.MAX_ANALYSIS_DEPTH = '15'; // Invalid range

      const result = EnvironmentValidator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('GEMINI_TEMPERATURE must be between 0 and 2');
      expect(result.errors).toContain('GEMINI_TOP_P must be between 0 and 1');
      expect(result.errors).toContain('MAX_ANALYSIS_DEPTH must be between 1 and 10');
    });

    it('should validate log level', () => {
      process.env.GEMINI_API_KEY = 'valid-api-key-12345';
      process.env.LOG_LEVEL = 'invalid-level';

      const result = EnvironmentValidator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('LOG_LEVEL must be one of: error, warn, info, debug, trace');
    });

    it('should provide configuration warnings', () => {
      process.env.GEMINI_API_KEY = 'valid-api-key-12345';
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_DEV_MODE = 'true';
      process.env.SECURE_CODE_READING = 'false';

      const result = EnvironmentValidator.validate();

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Development mode is enabled in production environment');
      expect(result.warnings).toContain('Secure code reading is disabled - potential security risk');
    });
  });

  describe('getEnvVar', () => {
    it('should return default value when variable is not set', () => {
      const result = EnvironmentValidator.getEnvVar('MISSING_VAR', 'default');
      expect(result).toBe('default');
    });

    it('should convert string to boolean', () => {
      process.env.TEST_BOOL_TRUE = 'true';
      process.env.TEST_BOOL_FALSE = 'false';
      process.env.TEST_BOOL_ONE = '1';
      process.env.TEST_BOOL_ZERO = '0';

      expect(EnvironmentValidator.getEnvVar('TEST_BOOL_TRUE', false)).toBe(true);
      expect(EnvironmentValidator.getEnvVar('TEST_BOOL_FALSE', true)).toBe(false);
      expect(EnvironmentValidator.getEnvVar('TEST_BOOL_ONE', false)).toBe(true);
      expect(EnvironmentValidator.getEnvVar('TEST_BOOL_ZERO', true)).toBe(false);
    });

    it('should convert string to number', () => {
      process.env.TEST_NUMBER = '42';
      process.env.TEST_FLOAT = '3.14';
      process.env.TEST_INVALID_NUMBER = 'not-a-number';

      expect(EnvironmentValidator.getEnvVar('TEST_NUMBER', 0)).toBe(42);
      expect(EnvironmentValidator.getEnvVar('TEST_FLOAT', 0)).toBe(3.14);
      expect(EnvironmentValidator.getEnvVar('TEST_INVALID_NUMBER', 100)).toBe(100);
    });

    it('should use custom converter', () => {
      process.env.TEST_ARRAY = 'item1,item2,item3';

      const result = EnvironmentValidator.getEnvVar(
        'TEST_ARRAY',
        [],
        (value) => value.split(',')
      );

      expect(result).toEqual(['item1', 'item2', 'item3']);
    });

    it('should handle converter errors gracefully', () => {
      process.env.TEST_CONVERTER_ERROR = 'invalid-value';

      const result = EnvironmentValidator.getEnvVar(
        'TEST_CONVERTER_ERROR',
        'default',
        () => {
          throw new Error('Conversion failed');
        }
      );

      expect(result).toBe('default');
    });
  });

  describe('getValidatedConfig', () => {
    it('should return validated configuration', () => {
      process.env.GEMINI_API_KEY = 'valid-api-key-12345';
      process.env.NODE_ENV = 'test';
      process.env.LOG_LEVEL = 'debug';

      const config = EnvironmentValidator.getValidatedConfig();

      expect(config.geminiApiKey).toBe('valid-api-key-12345');
      expect(config.nodeEnv).toBe('test');
      expect(config.logLevel).toBe('debug');
    });

    it('should throw error for invalid configuration', () => {
      delete process.env.GEMINI_API_KEY;

      expect(() => {
        EnvironmentValidator.getValidatedConfig();
      }).toThrow('Environment validation failed');
    });
  });

  describe('configuration defaults', () => {
    it('should apply default values correctly', () => {
      process.env.GEMINI_API_KEY = 'valid-api-key-12345';
      // Jest sets NODE_ENV to 'test', so we need to account for that
      delete process.env.NODE_ENV;

      const config = EnvironmentValidator.getValidatedConfig();

      // Check some default values
      expect(config.nodeEnv).toBe('development');
      expect(config.mcpServerName).toBe('deep-code-reasoning-mcp');
      expect(config.mcpServerVersion).toBe('0.1.0');
      expect(config.geminiModel).toBe('gemini-2.5-pro-preview-06-05');
      expect(config.geminiTemperature).toBe(0.2);
      expect(config.defaultAnalysisDepth).toBe(3);
      expect(config.maxAnalysisDepth).toBe(5);
      expect(config.logLevel).toBe('info');
      expect(config.secureCodeReading).toBe(true);
      expect(config.enablePromptSanitization).toBe(true);
    });

    it('should override defaults with environment variables', () => {
      process.env.GEMINI_API_KEY = 'valid-api-key-12345';
      process.env.NODE_ENV = 'production';
      process.env.GEMINI_TEMPERATURE = '0.5';
      process.env.DEFAULT_ANALYSIS_DEPTH = '5';
      process.env.LOG_LEVEL = 'error';

      const config = EnvironmentValidator.getValidatedConfig();

      expect(config.nodeEnv).toBe('production');
      expect(config.geminiTemperature).toBe(0.5);
      expect(config.defaultAnalysisDepth).toBe(5);
      expect(config.logLevel).toBe('error');
    });
  });

  describe('array configuration', () => {
    it('should parse comma-separated values correctly', () => {
      process.env.GEMINI_API_KEY = 'valid-api-key-12345';
      process.env.ALLOWED_FILE_EXTENSIONS = '.ts,.js,.py,.java';
      process.env.ALLOWED_PATHS = '/home,/workspace,/project';
      process.env.EXPERIMENTAL_FEATURE_FLAGS = 'feature1,feature2,feature3';

      const config = EnvironmentValidator.getValidatedConfig();

      expect(config.allowedFileExtensions).toEqual(['.ts', '.js', '.py', '.java']);
      expect(config.allowedPaths).toEqual(['/home', '/workspace', '/project']);
      expect(config.experimentalFeatureFlags).toEqual(['feature1', 'feature2', 'feature3']);
    });

    it('should handle empty array configuration', () => {
      process.env.GEMINI_API_KEY = 'valid-api-key-12345';
      process.env.EXPERIMENTAL_FEATURE_FLAGS = '';

      const config = EnvironmentValidator.getValidatedConfig();

      expect(config.experimentalFeatureFlags).toEqual([]);
    });
  });

  describe('security validation', () => {
    it('should warn about insecure configurations', () => {
      process.env.GEMINI_API_KEY = 'valid-api-key-12345';
      process.env.SECURE_CODE_READING = 'false';
      process.env.ENABLE_PROMPT_SANITIZATION = 'false';
      process.env.ENABLE_PROMPT_LOGGING = 'true';
      process.env.ENABLE_DEV_MODE = 'false';

      const result = EnvironmentValidator.validate();

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Secure code reading is disabled - potential security risk');
      expect(result.warnings).toContain('Prompt sanitization is disabled - potential security risk');
      expect(result.warnings).toContain('Prompt logging enabled in non-development mode - may expose sensitive data');
    });
  });

  describe('performance warnings', () => {
    it('should warn about potentially problematic performance settings', () => {
      process.env.GEMINI_API_KEY = 'valid-api-key-12345';
      process.env.MAX_CONCURRENT_REQUESTS = '50';
      process.env.GEMINI_REQUESTS_PER_MINUTE = '200';
      process.env.LOG_TO_FILE = 'true';
      process.env.LOG_MAX_FILE_SIZE = '134217728'; // 128MB - above 100MB threshold

      const result = EnvironmentValidator.validate();

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('High MAX_CONCURRENT_REQUESTS may cause rate limiting');
      expect(result.warnings).toContain('High GEMINI_REQUESTS_PER_MINUTE may exceed API limits');
      expect(result.warnings).toContain('Log file size limit is very high - consider rotating logs more frequently');
    });
  });
});
