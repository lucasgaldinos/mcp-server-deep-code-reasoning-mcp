/**
 * Naming Conventions Guide and Validator for Deep Code Reasoning MCP Server
 * 
 * This module defines and enforces consistent naming conventions across the codebase.
 * All naming conventions follow TypeScript/JavaScript best practices with specific
 * project requirements for MCP server development.
 */

export interface INamingConventions {
  // File and Directory Conventions
  files: {
    typescript: RegExp;
    test: RegExp;
    config: RegExp;
    docs: RegExp;
  };
  
  // Code Element Conventions
  variables: RegExp;
  functions: RegExp;
  classes: RegExp;
  interfaces: RegExp;
  types: RegExp;
  enums: RegExp;
  constants: RegExp;
  
  // API and Schema Conventions
  apiParameters: RegExp;
  schemaNames: RegExp;
  toolNames: RegExp;
  errorCodes: RegExp;
  
  // Special Cases
  eventTypes: RegExp;
  logMessages: RegExp;
  configKeys: RegExp;
}

/**
 * Centralized naming convention patterns for the project
 */
export class NamingConventions {
  // File and Directory Naming
  static readonly FILE_PATTERNS = {
    // TypeScript source files: camelCase.ts
    typescript: /^[a-z][a-zA-Z0-9]*\.ts$/,
    
    // Test files: camelCase.test.ts or ClassName.test.ts
    test: /^[a-zA-Z][a-zA-Z0-9]*\.test\.ts$/,
    
    // Configuration files: kebab-case or camelCase
    config: /^([\w-]+\.)?(config|rc|eslint|prettier|jest|tsconfig)\.[\w.]+$/,
    
    // Documentation files: UPPERCASE.md or kebab-case.md
    docs: /^([A-Z_]+|[\w-]+)\.md$/,
  };

  // TypeScript Code Conventions
  static readonly CODE_PATTERNS = {
    // Variables and functions: camelCase
    variables: /^[a-z][a-zA-Z0-9]*$/,
    functions: /^[a-z][a-zA-Z0-9]*$/,
    
    // Classes: PascalCase
    classes: /^[A-Z][a-zA-Z0-9]*$/,
    
    // Interfaces: PascalCase (modern TypeScript convention, no I prefix)
    interfaces: /^[A-Z][a-zA-Z0-9]*$/,
    
    // Type aliases: PascalCase
    types: /^[A-Z][a-zA-Z0-9]*$/,
    
    // Enums: PascalCase
    enums: /^[A-Z][a-zA-Z0-9]*$/,
    
    // Constants: SCREAMING_SNAKE_CASE
    constants: /^[A-Z][A-Z0-9_]*$/,
    
    // Private members: leading underscore + camelCase
    privateMethods: /^_[a-z][a-zA-Z0-9]*$/,
    privateFields: /^_[a-z][a-zA-Z0-9]*$/,
  };

  // API and External Interface Conventions
  static readonly API_PATTERNS = {
    // MCP tool parameters: snake_case (external API requirement)
    apiParameters: /^[a-z][a-z0-9_]*$/,
    
    // Zod schema names: PascalCase + 'Schema'
    schemaNames: /^[A-Z][a-zA-Z0-9]*Schema$/,
    
    // MCP tool names: snake_case
    toolNames: /^[a-z][a-z0-9_]*$/,
    
    // Error codes: SCREAMING_SNAKE_CASE
    errorCodes: /^[A-Z][A-Z0-9_]*$/,
  };

  // Event and Logging Conventions
  static readonly SPECIAL_PATTERNS = {
    // Event types: kebab-case
    eventTypes: /^[a-z][a-z0-9-]*$/,
    
    // Log messages: Sentence case with context prefix
    logMessages: /^\[[A-Z][a-zA-Z0-9]*\] [A-Z].*$/,
    
    // Environment config keys: SCREAMING_SNAKE_CASE
    configKeys: /^[A-Z][A-Z0-9_]*$/,
  };

  /**
   * Validates a name against the appropriate pattern
   */
  static validateName(name: string, type: NamingType): INamingValidationResult {
    const pattern = this.getPatternForType(type);
    const isValid = pattern.test(name);
    
    return {
      isValid,
      name,
      type,
      pattern: pattern.source,
      suggestion: isValid ? undefined : this.suggestCorrection(name, type),
      examples: this.getExamplesForType(type),
    };
  }

  /**
   * Gets the regex pattern for a specific naming type
   */
  static getPatternForType(type: NamingType): RegExp {
    switch (type) {
      // Files
      case 'typescript-file': return this.FILE_PATTERNS.typescript;
      case 'test-file': return this.FILE_PATTERNS.test;
      case 'config-file': return this.FILE_PATTERNS.config;
      case 'doc-file': return this.FILE_PATTERNS.docs;
      
      // Code elements
      case 'variable': return this.CODE_PATTERNS.variables;
      case 'function': return this.CODE_PATTERNS.functions;
      case 'class': return this.CODE_PATTERNS.classes;
      case 'interface': return this.CODE_PATTERNS.interfaces;
      case 'type': return this.CODE_PATTERNS.types;
      case 'enum': return this.CODE_PATTERNS.enums;
      case 'constant': return this.CODE_PATTERNS.constants;
      case 'private-method': return this.CODE_PATTERNS.privateMethods;
      case 'private-field': return this.CODE_PATTERNS.privateFields;
      
      // API elements
      case 'api-parameter': return this.API_PATTERNS.apiParameters;
      case 'schema-name': return this.API_PATTERNS.schemaNames;
      case 'tool-name': return this.API_PATTERNS.toolNames;
      case 'error-code': return this.API_PATTERNS.errorCodes;
      
      // Special cases
      case 'event-type': return this.SPECIAL_PATTERNS.eventTypes;
      case 'log-message': return this.SPECIAL_PATTERNS.logMessages;
      case 'config-key': return this.SPECIAL_PATTERNS.configKeys;
      
      default:
        throw new Error(`Unknown naming type: ${type}`);
    }
  }

  /**
   * Suggests a corrected name based on the type and common patterns
   */
  static suggestCorrection(name: string, type: NamingType): string {
    switch (type) {
      case 'variable':
      case 'function':
        return this.toCamelCase(name);
      
      case 'class':
      case 'type':
      case 'enum':
        return this.toPascalCase(name);
      
      case 'interface':
        return this.toPascalCase(name);
      
      case 'constant':
      case 'error-code':
      case 'config-key':
        return this.toScreamingSnakeCase(name);
      
      case 'api-parameter':
      case 'tool-name':
        return this.toSnakeCase(name);
      
      case 'event-type':
        return this.toKebabCase(name);
      
      case 'schema-name':
        const schemaBase = this.toPascalCase(name);
        return schemaBase.endsWith('Schema') ? schemaBase : `${schemaBase}Schema`;
      
      case 'private-method':
      case 'private-field':
        const camelName = this.toCamelCase(name);
        return camelName.startsWith('_') ? camelName : `_${camelName}`;
      
      default:
        return name;
    }
  }

  /**
   * Provides examples for each naming type
   */
  static getExamplesForType(type: NamingType): string[] {
    switch (type) {
      case 'typescript-file':
        return ['index.ts', 'geminiService.ts', 'environmentValidator.ts'];
      
      case 'test-file':
        return ['geminiService.test.ts', 'EnvironmentValidator.test.ts'];
      
      case 'variable':
      case 'function':
        return ['userName', 'validateInput', 'getCurrentSession', 'apiKey'];
      
      case 'class':
        return ['GeminiService', 'EnvironmentValidator', 'ConversationManager'];
      
      case 'interface':
        return ['UserData', 'ApiResponse', 'ConversationState', 'EnvironmentConfig'];
      
      case 'type':
        return ['AnalysisType', 'EventHandler', 'ConversationState'];
      
      case 'enum':
        return ['LogLevel', 'AnalysisStatus', 'EventType'];
      
      case 'constant':
        return ['GEMINI_API_KEY', 'MAX_RETRIES', 'DEFAULT_TIMEOUT'];
      
      case 'api-parameter':
        return ['claude_context', 'session_id', 'analysis_type'];
      
      case 'tool-name':
        return ['start_conversation', 'analyze_with_gemini', 'trace_execution_path'];
      
      case 'schema-name':
        return ['ClaudeContextSchema', 'ValidationResultSchema', 'ConfigSchema'];
      
      case 'error-code':
        return ['API_ERROR', 'SESSION_NOT_FOUND', 'RATE_LIMIT_EXCEEDED'];
      
      case 'event-type':
        return ['analysis-started', 'conversation-ended', 'health-check-failed'];
      
      case 'config-key':
        return ['GEMINI_API_KEY', 'LOG_LEVEL', 'ENABLE_DEBUG_LOGGING'];
      
      default:
        return [];
    }
  }

  // Case conversion utilities
  static toCamelCase(str: string): string {
    // Handle different input formats
    return str
      // Split on camelCase boundaries, underscores, hyphens, and spaces
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .split(/\s+/)
      .map((word, index) => {
        const lowered = word.toLowerCase();
        return index === 0 ? lowered : lowered.charAt(0).toUpperCase() + lowered.slice(1);
      })
      .join('');
  }

  static toPascalCase(str: string): string {
    // Handle different input formats
    return str
      // Split on camelCase boundaries, underscores, hyphens, and spaces
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .split(/\s+/)
      .map(word => {
        const lowered = word.toLowerCase();
        return lowered.charAt(0).toUpperCase() + lowered.slice(1);
      })
      .join('');
  }

  static toSnakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
  }

  static toScreamingSnakeCase(str: string): string {
    return this.toSnakeCase(str).toUpperCase();
  }

  static toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Validates an entire codebase file for naming convention compliance
   */
  static validateFile(content: string, filePath: string): IFileValidationResult {
    const violations: INamingViolation[] = [];
    
    // Extract different code elements and validate them
    this.extractAndValidateClasses(content, violations);
    this.extractAndValidateInterfaces(content, violations);
    this.extractAndValidateFunctions(content, violations);
    this.extractAndValidateVariables(content, violations);
    this.extractAndValidateConstants(content, violations);
    
    return {
      filePath,
      isValid: violations.length === 0,
      violations,
      summary: {
        totalChecks: this.countTotalElements(content),
        violationCount: violations.length,
        compliancePercentage: Math.round((1 - violations.length / this.countTotalElements(content)) * 100),
      },
    };
  }

  private static extractAndValidateClasses(content: string, violations: INamingViolation[]): void {
    const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const result = this.validateName(className, 'class');
      
      if (!result.isValid) {
        violations.push({
          type: 'class',
          name: className,
          line: this.getLineNumber(content, match.index),
          expected: result.suggestion || 'PascalCase',
          actual: className,
          pattern: result.pattern,
        });
      }
    }
  }

  private static extractAndValidateInterfaces(content: string, violations: INamingViolation[]): void {
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)/g;
    let match;
    
    while ((match = interfaceRegex.exec(content)) !== null) {
      const interfaceName = match[1];
      const result = this.validateName(interfaceName, 'interface');
      
      if (!result.isValid) {
        violations.push({
          type: 'interface',
          name: interfaceName,
          line: this.getLineNumber(content, match.index),
          expected: result.suggestion || 'IPascalCase',
          actual: interfaceName,
          pattern: result.pattern,
        });
      }
    }
  }

  private static extractAndValidateFunctions(content: string, violations: INamingViolation[]): void {
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(\w+)\s*[:=]\s*(?:async\s+)?\(/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1] || match[2];
      
      // Skip constructor and special methods
      if (functionName === 'constructor' || functionName.startsWith('set') || functionName.startsWith('get')) {
        continue;
      }
      
      const result = this.validateName(functionName, 'function');
      
      if (!result.isValid) {
        violations.push({
          type: 'function',
          name: functionName,
          line: this.getLineNumber(content, match.index),
          expected: result.suggestion || 'camelCase',
          actual: functionName,
          pattern: result.pattern,
        });
      }
    }
  }

  private static extractAndValidateVariables(content: string, violations: INamingViolation[]): void {
    const variableRegex = /(?:const|let|var)\s+(\w+)/g;
    let match;
    
    while ((match = variableRegex.exec(content)) !== null) {
      const variableName = match[1];
      
      // Skip constants (all uppercase)
      if (variableName === variableName.toUpperCase()) {
        continue;
      }
      
      const result = this.validateName(variableName, 'variable');
      
      if (!result.isValid) {
        violations.push({
          type: 'variable',
          name: variableName,
          line: this.getLineNumber(content, match.index),
          expected: result.suggestion || 'camelCase',
          actual: variableName,
          pattern: result.pattern,
        });
      }
    }
  }

  private static extractAndValidateConstants(content: string, violations: INamingViolation[]): void {
    const constantRegex = /(?:const|static readonly)\s+([A-Z_][A-Z0-9_]*)/g;
    let match;
    
    while ((match = constantRegex.exec(content)) !== null) {
      const constantName = match[1];
      const result = this.validateName(constantName, 'constant');
      
      if (!result.isValid) {
        violations.push({
          type: 'constant',
          name: constantName,
          line: this.getLineNumber(content, match.index),
          expected: result.suggestion || 'SCREAMING_SNAKE_CASE',
          actual: constantName,
          pattern: result.pattern,
        });
      }
    }
  }

  private static getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private static countTotalElements(content: string): number {
    const patterns = [
      /(?:export\s+)?(?:abstract\s+)?class\s+\w+/g,
      /(?:export\s+)?interface\s+\w+/g,
      /(?:export\s+)?(?:async\s+)?function\s+\w+/g,
      /\w+\s*[:=]\s*(?:async\s+)?\(/g,
      /(?:const|let|var)\s+\w+/g,
    ];
    
    let count = 0;
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      count += matches ? matches.length : 0;
    }
    
    return Math.max(count, 1); // Avoid division by zero
  }

  /**
   * Generates a naming conventions report for the project
   */
  static generateProjectReport(files: Map<string, string>): IProjectNamingReport {
    const fileResults: IFileValidationResult[] = [];
    let totalViolations = 0;
    let totalElements = 0;
    
    for (const [filePath, content] of files) {
      if (filePath.endsWith('.ts') && !filePath.includes('node_modules')) {
        const result = this.validateFile(content, filePath);
        fileResults.push(result);
        totalViolations += result.violations.length;
        totalElements += result.summary.totalChecks;
      }
    }
    
    const compliancePercentage = totalElements > 0 
      ? Math.round((1 - totalViolations / totalElements) * 100)
      : 100;
    
    return {
      summary: {
        filesChecked: fileResults.length,
        totalElements,
        totalViolations,
        compliancePercentage,
      },
      fileResults,
      recommendations: this.generateRecommendations(fileResults),
    };
  }

  private static generateRecommendations(fileResults: IFileValidationResult[]): string[] {
    const recommendations: string[] = [];
    const violationTypes = new Map<string, number>();
    
    // Count violation types
    for (const result of fileResults) {
      for (const violation of result.violations) {
        const count = violationTypes.get(violation.type) || 0;
        violationTypes.set(violation.type, count + 1);
      }
    }
    
    // Generate recommendations based on most common violations
    const sortedViolations = Array.from(violationTypes.entries())
      .sort(([, a], [, b]) => b - a);
    
    for (const [type, count] of sortedViolations.slice(0, 3)) {
      recommendations.push(
        `Focus on ${type} naming: ${count} violations found. ` +
        `Follow ${this.getConventionDescription(type as NamingType)} convention.`
      );
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Great! No major naming convention issues found.');
    } else {
      recommendations.push('Consider setting up automated linting to catch naming issues early.');
      recommendations.push('Document project-specific naming conventions in a style guide.');
    }
    
    return recommendations;
  }

  private static getConventionDescription(type: NamingType): string {
    const descriptions: Record<string, string> = {
      'class': 'PascalCase',
      'interface': 'PascalCase (modern TypeScript - no I prefix)',
      'function': 'camelCase',
      'variable': 'camelCase',
      'constant': 'SCREAMING_SNAKE_CASE',
      'type': 'PascalCase',
      'enum': 'PascalCase',
    };
    
    return descriptions[type] || 'project-specific';
  }
}

// Type definitions for the naming system
export type NamingType = 
  | 'typescript-file' | 'test-file' | 'config-file' | 'doc-file'
  | 'variable' | 'function' | 'class' | 'interface' | 'type' | 'enum' | 'constant'
  | 'private-method' | 'private-field'
  | 'api-parameter' | 'schema-name' | 'tool-name' | 'error-code'
  | 'event-type' | 'log-message' | 'config-key';

export interface INamingValidationResult {
  isValid: boolean;
  name: string;
  type: NamingType;
  pattern: string;
  suggestion?: string;
  examples: string[];
}

export interface INamingViolation {
  type: string;
  name: string;
  line: number;
  expected: string;
  actual: string;
  pattern: string;
}

export interface IFileValidationResult {
  filePath: string;
  isValid: boolean;
  violations: INamingViolation[];
  summary: {
    totalChecks: number;
    violationCount: number;
    compliancePercentage: number;
  };
}

export interface IProjectNamingReport {
  summary: {
    filesChecked: number;
    totalElements: number;
    totalViolations: number;
    compliancePercentage: number;
  };
  fileResults: IFileValidationResult[];
  recommendations: string[];
}
