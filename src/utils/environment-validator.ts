/**
 * Environment Configuration Validator
 * Validates environment variables and provides configuration defaults
 */

export interface IEnvironmentConfig {
  // Optional AI provider configuration
  geminiApiKey?: string;

  // Optional multi-provider configuration
  openaiApiKey?: string;

  // Server configuration
  nodeEnv: string;
  mcpServerName: string;
  mcpServerVersion: string;
  requestTimeout: number;
  maxConcurrentRequests: number;

  // Gemini AI configuration
  geminiModel: string;
  geminiApiVersion: string;
  geminiTemperature: number;
  geminiTopK: number;
  geminiTopP: number;
  geminiMaxOutputTokens: number;
  geminiConversationTemperature: number;
  geminiConversationMaxTokens: number;
  maxContextSize: number;

  // Analysis configuration
  defaultAnalysisDepth: number;
  maxAnalysisDepth: number;
  maxExecutionPaths: number;
  maxPerformanceChecks: number;
  maxFileSize: number;
  maxFilesPerRequest: number;
  allowedFileExtensions: string[];
  maxHypothesesPerTournament: number;
  hypothesisConfidenceThreshold: number;

  // Circuit breaker configuration
  geminiMaxRetries: number;
  geminiBackoffDelay: number;
  geminiCircuitBreakerThreshold: number;
  geminiCircuitBreakerTimeout: number;
  geminiRequestsPerMinute: number;
  geminiBurstLimit: number;

  // Logging configuration
  logLevel: string;
  logToConsole: boolean;
  logToFile: boolean;
  logFile: string;
  logMaxFileSize: number;
  logMaxFiles: number;
  enableDebugLogging: boolean;
  enablePerformanceLogging: boolean;
  enablePromptLogging: boolean;

  // Security configuration
  secureCodeReading: boolean;
  allowedPaths: string[];
  blockedPaths: string[];
  enablePromptSanitization: boolean;
  maxPromptLength: number;
  sessionTimeout: number;
  maxActiveSessions: number;

  // Performance monitoring
  healthCheckInterval: number;
  healthCheckTimeout: number;
  enableMemoryMonitoring: boolean;
  memoryUsageThreshold: number;
  enableMetricsCollection: boolean;
  metricsExportInterval: number;

  // Conversational analysis
  conversationSessionTimeout: number;
  maxConversationTurns: number;
  conversationHistoryLimit: number;
  analysisBudgetDefault: number;
  minAnalysisBudget: number;

  // Development settings
  enableDevMode: boolean;
  mockGeminiResponses: boolean;
  enableToolValidation: boolean;
  testApiKey: string;
  enableIntegrationTests: boolean;

  // Feature flags
  enableCrossSystemAnalysis: boolean;
  enableExecutionTracing: boolean;
  enableHypothesisTournaments: boolean;
  enableExperimentalFeatures: boolean;
  experimentalFeatureFlags: string[];
}

export interface IValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: IEnvironmentConfig | null;
}

/**
 * Validates environment configuration and provides type-safe access to configuration values
 */
export class EnvironmentValidator {
  private static readonly REQUIRED_VARS = [
    // No required API keys - providers are optional
  ];

  private static readonly DEFAULT_CONFIG: Partial<IEnvironmentConfig> = {
    // Server defaults
    nodeEnv: 'development',
    mcpServerName: 'deep-code-reasoning-mcp',
    mcpServerVersion: '0.1.0',
    requestTimeout: 30000,
    maxConcurrentRequests: 5,

    // Gemini AI defaults
    geminiModel: 'gemini-2.5-flash',
    geminiApiVersion: 'v1beta',
    geminiTemperature: 0.2,
    geminiTopK: 1,
    geminiTopP: 1,
    geminiMaxOutputTokens: 8192,
    geminiConversationTemperature: 0.3,
    geminiConversationMaxTokens: 4096,
    maxContextSize: 1000000,

    // Analysis defaults
    defaultAnalysisDepth: 3,
    maxAnalysisDepth: 5,
    maxExecutionPaths: 10,
    maxPerformanceChecks: 20,
    maxFileSize: 1048576, // 1MB
    maxFilesPerRequest: 50,
    allowedFileExtensions: ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt'],
    maxHypothesesPerTournament: 10,
    hypothesisConfidenceThreshold: 0.7,

    // Circuit breaker defaults
    geminiMaxRetries: 3,
    geminiBackoffDelay: 1000,
    geminiCircuitBreakerThreshold: 5,
    geminiCircuitBreakerTimeout: 60000,
    geminiRequestsPerMinute: 60,
    geminiBurstLimit: 10,

    // Logging defaults
    logLevel: 'info',
    logToConsole: true,
    logToFile: false,
    logFile: 'logs/mcp-server.log',
    logMaxFileSize: 10485760, // 10MB
    logMaxFiles: 5,
    enableDebugLogging: false,
    enablePerformanceLogging: false,
    enablePromptLogging: false,

    // Security defaults
    secureCodeReading: true,
    allowedPaths: ['/home', '/Users', '/workspace', '/project'],
    blockedPaths: ['/etc', '/root', '/sys', '/proc'],
    enablePromptSanitization: true,
    maxPromptLength: 100000,
    sessionTimeout: 3600000, // 1 hour
    maxActiveSessions: 100,

    // Performance monitoring defaults
    healthCheckInterval: 30000,
    healthCheckTimeout: 5000,
    enableMemoryMonitoring: true,
    memoryUsageThreshold: 0.8,
    enableMetricsCollection: true,
    metricsExportInterval: 60000,

    // Conversational analysis defaults
    conversationSessionTimeout: 1800000, // 30 minutes
    maxConversationTurns: 50,
    conversationHistoryLimit: 20,
    analysisBudgetDefault: 100,
    minAnalysisBudget: 10,

    // Development defaults
    enableDevMode: false,
    mockGeminiResponses: false,
    enableToolValidation: true,
    testApiKey: 'test-key-for-unit-tests',
    enableIntegrationTests: false,

    // Feature flag defaults
    enableCrossSystemAnalysis: true,
    enableExecutionTracing: true,
    enableHypothesisTournaments: true,
    enableExperimentalFeatures: false,
    experimentalFeatureFlags: [],
  };

  /**
   * Validates the current environment configuration
   */
  public static validate(): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check required variables
      for (const requiredVar of this.REQUIRED_VARS) {
        if (!process.env[requiredVar]) {
          errors.push(`Required environment variable ${requiredVar} is not set`);
        }
      }

      // If we have critical errors, return early
      if (errors.length > 0) {
        return {
          isValid: false,
          errors,
          warnings,
          config: null,
        };
      }

      // Build configuration with defaults
      const config = this.buildConfig();

      // Validate configuration values
      const validationErrors = this.validateConfig(config);
      errors.push(...validationErrors);

      // Check for common configuration issues
      const configWarnings = this.checkWarnings(config);
      warnings.push(...configWarnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        config: errors.length === 0 ? config : null,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Environment validation failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings,
        config: null,
      };
    }
  }

  /**
   * Gets a specific environment variable with type conversion
   */
  public static getEnvVar<T>(
    key: string,
    defaultValue: T,
    converter?: (value: string) => T,
  ): T {
    const value = process.env[key];

    if (value === undefined) {
      return defaultValue;
    }

    if (converter) {
      try {
        return converter(value);
      } catch (error) {
        console.warn(`Failed to convert environment variable ${key}: ${error}. Using default value.`);
        return defaultValue;
      }
    }

    // Type-based conversion
    if (typeof defaultValue === 'boolean') {
      return (value.toLowerCase() === 'true' || value === '1') as unknown as T;
    }

    if (typeof defaultValue === 'number') {
      const numValue = Number(value);
      return (isNaN(numValue) ? defaultValue : numValue) as unknown as T;
    }

    return value as unknown as T;
  }

  /**
   * Builds the configuration object from environment variables and defaults
   */
  private static buildConfig(): IEnvironmentConfig {
    return {
      // Optional AI provider configuration
      geminiApiKey: process.env.GEMINI_API_KEY,

      // Optional multi-provider configuration
      openaiApiKey: process.env.OPENAI_API_KEY,

      // Server configuration
      nodeEnv: this.getEnvVar('NODE_ENV', this.DEFAULT_CONFIG.nodeEnv!),
      mcpServerName: this.getEnvVar('MCP_SERVER_NAME', this.DEFAULT_CONFIG.mcpServerName!),
      mcpServerVersion: this.getEnvVar('MCP_SERVER_VERSION', this.DEFAULT_CONFIG.mcpServerVersion!),
      requestTimeout: this.getEnvVar('REQUEST_TIMEOUT', this.DEFAULT_CONFIG.requestTimeout!),
      maxConcurrentRequests: this.getEnvVar('MAX_CONCURRENT_REQUESTS', this.DEFAULT_CONFIG.maxConcurrentRequests!),

      // Gemini AI configuration
      geminiModel: this.getEnvVar('GEMINI_MODEL', this.DEFAULT_CONFIG.geminiModel!),
      geminiApiVersion: this.getEnvVar('GEMINI_API_VERSION', this.DEFAULT_CONFIG.geminiApiVersion!),
      geminiTemperature: this.getEnvVar('GEMINI_TEMPERATURE', this.DEFAULT_CONFIG.geminiTemperature!),
      geminiTopK: this.getEnvVar('GEMINI_TOP_K', this.DEFAULT_CONFIG.geminiTopK!),
      geminiTopP: this.getEnvVar('GEMINI_TOP_P', this.DEFAULT_CONFIG.geminiTopP!),
      geminiMaxOutputTokens: this.getEnvVar('GEMINI_MAX_OUTPUT_TOKENS', this.DEFAULT_CONFIG.geminiMaxOutputTokens!),
      geminiConversationTemperature: this.getEnvVar('GEMINI_CONVERSATION_TEMPERATURE', this.DEFAULT_CONFIG.geminiConversationTemperature!),
      geminiConversationMaxTokens: this.getEnvVar('GEMINI_CONVERSATION_MAX_TOKENS', this.DEFAULT_CONFIG.geminiConversationMaxTokens!),
      maxContextSize: this.getEnvVar('MAX_CONTEXT_SIZE', this.DEFAULT_CONFIG.maxContextSize!),

      // Analysis configuration
      defaultAnalysisDepth: this.getEnvVar('DEFAULT_ANALYSIS_DEPTH', this.DEFAULT_CONFIG.defaultAnalysisDepth!),
      maxAnalysisDepth: this.getEnvVar('MAX_ANALYSIS_DEPTH', this.DEFAULT_CONFIG.maxAnalysisDepth!),
      maxExecutionPaths: this.getEnvVar('MAX_EXECUTION_PATHS', this.DEFAULT_CONFIG.maxExecutionPaths!),
      maxPerformanceChecks: this.getEnvVar('MAX_PERFORMANCE_CHECKS', this.DEFAULT_CONFIG.maxPerformanceChecks!),
      maxFileSize: this.getEnvVar('MAX_FILE_SIZE_BYTES', this.DEFAULT_CONFIG.maxFileSize!),
      maxFilesPerRequest: this.getEnvVar('MAX_FILES_PER_REQUEST', this.DEFAULT_CONFIG.maxFilesPerRequest!),
      allowedFileExtensions: this.getEnvVar('ALLOWED_FILE_EXTENSIONS', this.DEFAULT_CONFIG.allowedFileExtensions!, (value) => value.split(',')),
      maxHypothesesPerTournament: this.getEnvVar('MAX_HYPOTHESES_PER_TOURNAMENT', this.DEFAULT_CONFIG.maxHypothesesPerTournament!),
      hypothesisConfidenceThreshold: this.getEnvVar('HYPOTHESIS_CONFIDENCE_THRESHOLD', this.DEFAULT_CONFIG.hypothesisConfidenceThreshold!),

      // Circuit breaker configuration
      geminiMaxRetries: this.getEnvVar('GEMINI_MAX_RETRIES', this.DEFAULT_CONFIG.geminiMaxRetries!),
      geminiBackoffDelay: this.getEnvVar('GEMINI_BACKOFF_DELAY', this.DEFAULT_CONFIG.geminiBackoffDelay!),
      geminiCircuitBreakerThreshold: this.getEnvVar('GEMINI_CIRCUIT_BREAKER_THRESHOLD', this.DEFAULT_CONFIG.geminiCircuitBreakerThreshold!),
      geminiCircuitBreakerTimeout: this.getEnvVar('GEMINI_CIRCUIT_BREAKER_TIMEOUT', this.DEFAULT_CONFIG.geminiCircuitBreakerTimeout!),
      geminiRequestsPerMinute: this.getEnvVar('GEMINI_REQUESTS_PER_MINUTE', this.DEFAULT_CONFIG.geminiRequestsPerMinute!),
      geminiBurstLimit: this.getEnvVar('GEMINI_BURST_LIMIT', this.DEFAULT_CONFIG.geminiBurstLimit!),

      // Logging configuration
      logLevel: this.getEnvVar('LOG_LEVEL', this.DEFAULT_CONFIG.logLevel!),
      logToConsole: this.getEnvVar('LOG_TO_CONSOLE', this.DEFAULT_CONFIG.logToConsole!),
      logToFile: this.getEnvVar('LOG_TO_FILE', this.DEFAULT_CONFIG.logToFile!),
      logFile: this.getEnvVar('LOG_FILE', this.DEFAULT_CONFIG.logFile!),
      logMaxFileSize: this.getEnvVar('LOG_MAX_FILE_SIZE', this.DEFAULT_CONFIG.logMaxFileSize!),
      logMaxFiles: this.getEnvVar('LOG_MAX_FILES', this.DEFAULT_CONFIG.logMaxFiles!),
      enableDebugLogging: this.getEnvVar('ENABLE_DEBUG_LOGGING', this.DEFAULT_CONFIG.enableDebugLogging!),
      enablePerformanceLogging: this.getEnvVar('ENABLE_PERFORMANCE_LOGGING', this.DEFAULT_CONFIG.enablePerformanceLogging!),
      enablePromptLogging: this.getEnvVar('ENABLE_PROMPT_LOGGING', this.DEFAULT_CONFIG.enablePromptLogging!),

      // Security configuration
      secureCodeReading: this.getEnvVar('SECURE_CODE_READING', this.DEFAULT_CONFIG.secureCodeReading!),
      allowedPaths: this.getEnvVar('ALLOWED_PATHS', this.DEFAULT_CONFIG.allowedPaths!, (value) => value.split(',')),
      blockedPaths: this.getEnvVar('BLOCKED_PATHS', this.DEFAULT_CONFIG.blockedPaths!, (value) => value.split(',')),
      enablePromptSanitization: this.getEnvVar('ENABLE_PROMPT_SANITIZATION', this.DEFAULT_CONFIG.enablePromptSanitization!),
      maxPromptLength: this.getEnvVar('MAX_PROMPT_LENGTH', this.DEFAULT_CONFIG.maxPromptLength!),
      sessionTimeout: this.getEnvVar('SESSION_TIMEOUT', this.DEFAULT_CONFIG.sessionTimeout!),
      maxActiveSessions: this.getEnvVar('MAX_ACTIVE_SESSIONS', this.DEFAULT_CONFIG.maxActiveSessions!),

      // Performance monitoring
      healthCheckInterval: this.getEnvVar('HEALTH_CHECK_INTERVAL', this.DEFAULT_CONFIG.healthCheckInterval!),
      healthCheckTimeout: this.getEnvVar('HEALTH_CHECK_TIMEOUT', this.DEFAULT_CONFIG.healthCheckTimeout!),
      enableMemoryMonitoring: this.getEnvVar('ENABLE_MEMORY_MONITORING', this.DEFAULT_CONFIG.enableMemoryMonitoring!),
      memoryUsageThreshold: this.getEnvVar('MEMORY_USAGE_THRESHOLD', this.DEFAULT_CONFIG.memoryUsageThreshold!),
      enableMetricsCollection: this.getEnvVar('ENABLE_METRICS_COLLECTION', this.DEFAULT_CONFIG.enableMetricsCollection!),
      metricsExportInterval: this.getEnvVar('METRICS_EXPORT_INTERVAL', this.DEFAULT_CONFIG.metricsExportInterval!),

      // Conversational analysis
      conversationSessionTimeout: this.getEnvVar('CONVERSATION_SESSION_TIMEOUT', this.DEFAULT_CONFIG.conversationSessionTimeout!),
      maxConversationTurns: this.getEnvVar('MAX_CONVERSATION_TURNS', this.DEFAULT_CONFIG.maxConversationTurns!),
      conversationHistoryLimit: this.getEnvVar('CONVERSATION_HISTORY_LIMIT', this.DEFAULT_CONFIG.conversationHistoryLimit!),
      analysisBudgetDefault: this.getEnvVar('ANALYSIS_BUDGET_DEFAULT', this.DEFAULT_CONFIG.analysisBudgetDefault!),
      minAnalysisBudget: this.getEnvVar('MIN_ANALYSIS_BUDGET', this.DEFAULT_CONFIG.minAnalysisBudget!),

      // Development settings
      enableDevMode: this.getEnvVar('ENABLE_DEV_MODE', this.DEFAULT_CONFIG.enableDevMode!),
      mockGeminiResponses: this.getEnvVar('MOCK_GEMINI_RESPONSES', this.DEFAULT_CONFIG.mockGeminiResponses!),
      enableToolValidation: this.getEnvVar('ENABLE_TOOL_VALIDATION', this.DEFAULT_CONFIG.enableToolValidation!),
      testApiKey: this.getEnvVar('TEST_API_KEY', this.DEFAULT_CONFIG.testApiKey!),
      enableIntegrationTests: this.getEnvVar('ENABLE_INTEGRATION_TESTS', this.DEFAULT_CONFIG.enableIntegrationTests!),

      // Feature flags
      enableCrossSystemAnalysis: this.getEnvVar('ENABLE_CROSS_SYSTEM_ANALYSIS', this.DEFAULT_CONFIG.enableCrossSystemAnalysis!),
      enableExecutionTracing: this.getEnvVar('ENABLE_EXECUTION_TRACING', this.DEFAULT_CONFIG.enableExecutionTracing!),
      enableHypothesisTournaments: this.getEnvVar('ENABLE_HYPOTHESIS_TOURNAMENTS', this.DEFAULT_CONFIG.enableHypothesisTournaments!),
      enableExperimentalFeatures: this.getEnvVar('ENABLE_EXPERIMENTAL_FEATURES', this.DEFAULT_CONFIG.enableExperimentalFeatures!),
      experimentalFeatureFlags: this.getEnvVar('EXPERIMENTAL_FEATURE_FLAGS', this.DEFAULT_CONFIG.experimentalFeatureFlags!, (value) => value ? value.split(',') : []),
    };
  }

  /**
   * Validates configuration values for common issues
   */
  private static validateConfig(config: IEnvironmentConfig): string[] {
    const errors: string[] = [];

    // Validate API key format if provided
    if (config.geminiApiKey && (config.geminiApiKey === 'your-gemini-api-key-here' || config.geminiApiKey.length < 10)) {
      errors.push('GEMINI_API_KEY appears to be a placeholder or invalid');
    }

    // Validate numeric ranges
    if (config.geminiTemperature < 0 || config.geminiTemperature > 2) {
      errors.push('GEMINI_TEMPERATURE must be between 0 and 2');
    }

    if (config.geminiTopK < 1) {
      errors.push('GEMINI_TOP_K must be at least 1');
    }

    if (config.geminiTopP < 0 || config.geminiTopP > 1) {
      errors.push('GEMINI_TOP_P must be between 0 and 1');
    }

    if (config.maxAnalysisDepth < 1 || config.maxAnalysisDepth > 10) {
      errors.push('MAX_ANALYSIS_DEPTH must be between 1 and 10');
    }

    if (config.hypothesisConfidenceThreshold < 0 || config.hypothesisConfidenceThreshold > 1) {
      errors.push('HYPOTHESIS_CONFIDENCE_THRESHOLD must be between 0 and 1');
    }

    if (config.memoryUsageThreshold < 0 || config.memoryUsageThreshold > 1) {
      errors.push('MEMORY_USAGE_THRESHOLD must be between 0 and 1');
    }

    // Validate timeout values
    if (config.requestTimeout < 1000) {
      errors.push('REQUEST_TIMEOUT should be at least 1000ms');
    }

    if (config.sessionTimeout < 60000) {
      errors.push('SESSION_TIMEOUT should be at least 60000ms (1 minute)');
    }

    // Validate file constraints
    if (config.maxFileSize < 1024) {
      errors.push('MAX_FILE_SIZE_BYTES should be at least 1024 bytes');
    }

    if (config.maxFilesPerRequest < 1) {
      errors.push('MAX_FILES_PER_REQUEST must be at least 1');
    }

    // Validate log level
    const validLogLevels = ['error', 'warn', 'info', 'debug', 'trace'];
    if (!validLogLevels.includes(config.logLevel)) {
      errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
    }

    return errors;
  }

  /**
   * Checks for configuration warnings (non-critical issues)
   */
  private static checkWarnings(config: IEnvironmentConfig): string[] {
    const warnings: string[] = [];

    // Development mode warnings
    if (config.enableDevMode && config.nodeEnv === 'production') {
      warnings.push('Development mode is enabled in production environment');
    }

    if (config.mockGeminiResponses && !config.enableDevMode) {
      warnings.push('Mock Gemini responses enabled without development mode');
    }

    // Performance warnings
    if (config.maxConcurrentRequests > 20) {
      warnings.push('High MAX_CONCURRENT_REQUESTS may cause rate limiting');
    }

    if (config.geminiRequestsPerMinute > 100) {
      warnings.push('High GEMINI_REQUESTS_PER_MINUTE may exceed API limits');
    }

    // Security warnings
    if (!config.secureCodeReading) {
      warnings.push('Secure code reading is disabled - potential security risk');
    }

    if (!config.enablePromptSanitization) {
      warnings.push('Prompt sanitization is disabled - potential security risk');
    }

    // Logging warnings
    if (config.enablePromptLogging && !config.enableDevMode) {
      warnings.push('Prompt logging enabled in non-development mode - may expose sensitive data');
    }

    if (config.logToFile && config.logMaxFileSize > 100 * 1024 * 1024) {
      warnings.push('Log file size limit is very high - consider rotating logs more frequently');
    }

    return warnings;
  }

  /**
   * Gets the validated configuration or throws an error
   */
  public static getValidatedConfig(): IEnvironmentConfig {
    const result = this.validate();

    if (!result.isValid) {
      throw new Error(`Environment validation failed:\n${result.errors.join('\n')}`);
    }

    if (result.warnings.length > 0) {
      console.warn('Environment validation warnings:');
      result.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    return result.config!;
  }

  /**
   * Prints a configuration summary for debugging
   */
  public static printConfigSummary(config: IEnvironmentConfig): void {
    console.log('Environment Configuration Summary:');
    console.log(`  Node Environment: ${config.nodeEnv}`);
    console.log(`  MCP Server: ${config.mcpServerName} v${config.mcpServerVersion}`);
    
    // Provider availability
    console.log('  AI Providers:');
    console.log(`    Gemini: ${config.geminiApiKey ? 'Available' : 'Not configured'}`);
    console.log(`    OpenAI: ${config.openaiApiKey ? 'Available' : 'Not configured'}`);
    
    if (config.geminiApiKey) {
      console.log(`  Gemini Model: ${config.geminiModel}`);
    }
    console.log(`  Max Context Size: ${config.maxContextSize.toLocaleString()}`);
    console.log(`  Analysis Depth: ${config.defaultAnalysisDepth} (max: ${config.maxAnalysisDepth})`);
    console.log(`  Log Level: ${config.logLevel}`);
    console.log(`  Security Features: ${config.secureCodeReading ? 'Enabled' : 'Disabled'}`);
    console.log(`  Development Mode: ${config.enableDevMode ? 'Enabled' : 'Disabled'}`);

    if (config.enableExperimentalFeatures) {
      console.log(`  Experimental Features: ${config.experimentalFeatureFlags.join(', ')}`);
    }
  }
}
