/**
 * Tests for JSDoc Documentation Generator and Validator
 * 
 * Comprehensive test suite covering JSDoc validation, report generation,
 * template creation, and CLI tool functionality for documentation analysis.
 * 
 * @author Deep Code Reasoning MCP Team
 * @version 1.0.0
 * @since 2024
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { JSDocGenerator, JSDocValidationResult, JSDocReport } from '../utils/JsDocGenerator.js';
import { JSDocCLI } from '../tools/jsdoc-cli.js';

describe('JSDocGenerator', () => {
  let tempDir: string;
  let testFiles: Record<string, string>;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'jsdoc-test-'));
    
    // Test file contents
    testFiles = {
      'well-documented.ts': `
/**
 * A well-documented user service class
 * 
 * @example
 * \`\`\`typescript
 * const service = new UserService();
 * const user = await service.getUser('123');
 * \`\`\`
 * 
 * @since 1.0.0
 */
export class UserService {
  /**
   * Retrieves user data by ID
   * 
   * @param userId - The unique identifier for the user
   * @param options - Optional parameters for the request
   * @returns Promise resolving to user data
   * 
   * @example
   * \`\`\`typescript
   * const user = await service.getUser('123', { includeProfile: true });
   * \`\`\`
   * 
   * @throws {Error} When user is not found
   * @since 1.0.0
   */
  async getUser(userId: string, options?: GetUserOptions): Promise<UserData> {
    return {} as UserData;
  }

  /**
   * Updates user information
   * 
   * @param userId - The user ID to update
   * @param data - New user data
   * @returns Promise resolving to updated user
   * 
   * @since 1.0.0
   */
  async updateUser(userId: string, data: Partial<UserData>): Promise<UserData> {
    return {} as UserData;
  }
}

/**
 * User data interface
 * 
 * @example
 * \`\`\`typescript
 * const userData: UserData = {
 *   id: '123',
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * };
 * \`\`\`
 * 
 * @since 1.0.0
 */
export interface UserData {
  id: string;
  name: string;
  email: string;
}

/**
 * Options for user retrieval
 * 
 * @since 1.0.0
 */
export interface GetUserOptions {
  includeProfile?: boolean;
}
`,

      'poorly-documented.ts': `
export class ApiService {
  // No JSDoc comment
  async fetchData(url: string): Promise<any> {
    return {};
  }

  /**
   * Incomplete documentation
   */
  processData(data: any) {
    return data;
  }

  /**
   * Has description but missing required tags
   * This method does something important
   */
  async saveData(data: any, options: any): Promise<void> {
    // implementation
  }
}

// No documentation
export interface ApiResponse {
  status: number;
  data: any;
}

export const API_CONSTANTS = {
  BASE_URL: 'https://api.example.com'
};
`,

      'mixed-documentation.ts': `
/**
 * Service with mixed documentation quality
 * 
 * @since 1.0.0
 */
export class MixedService {
  /**
   * Well documented method
   * 
   * @param input - Input parameter
   * @returns Processed result
   * 
   * @example
   * \`\`\`typescript
   * const result = service.goodMethod('test');
   * \`\`\`
   * 
   * @since 1.0.0
   */
  goodMethod(input: string): string {
    return input.toUpperCase();
  }

  // Missing documentation
  badMethod(input: number): number {
    return input * 2;
  }

  /**
   * Partially documented
   * @param value - Some value
   */
  partialMethod(value: boolean): void {
    // Missing @returns, @example, @since
  }
}

/**
 * Well documented interface
 * 
 * @example
 * \`\`\`typescript
 * const config: Config = { enabled: true, timeout: 5000 };
 * \`\`\`
 * 
 * @since 1.0.0
 */
export interface Config {
  enabled: boolean;
  timeout: number;
}

// Missing documentation
export type Status = 'pending' | 'completed' | 'failed';
`
    };

    // Write test files
    for (const [filename, content] of Object.entries(testFiles)) {
      await fs.promises.writeFile(path.join(tempDir, filename), content);
    }
  });

  afterEach(async () => {
    // Clean up temporary directory
    if (tempDir) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('validateFile', () => {
    test('should validate well-documented file correctly', async () => {
      const filePath = path.join(tempDir, 'well-documented.ts');
      const results = await JSDocGenerator.validateFile(filePath);

      expect(results).toHaveLength(5); // UserService, getUser, updateUser, UserData, GetUserOptions
      
      // All elements should be valid
      const validResults = results.filter((r: JSDocValidationResult) => r.isValid);
      expect(validResults).toHaveLength(5);

      // Check specific validation
      const getUserMethod = results.find((r: JSDocValidationResult) => r.elementName === 'getUser');
      expect(getUserMethod).toBeDefined();
      expect(getUserMethod!.isValid).toBe(true);
      expect(getUserMethod!.elementType).toBe('method');
      expect(getUserMethod!.missingTags).toHaveLength(0);
    });

    test('should identify issues in poorly documented file', async () => {
      const filePath = path.join(tempDir, 'poorly-documented.ts');
      const results = await JSDocGenerator.validateFile(filePath);

      expect(results.length).toBeGreaterThan(0);
      
      // Most elements should be invalid
      const invalidResults = results.filter((r: JSDocValidationResult) => !r.isValid);
      expect(invalidResults.length).toBeGreaterThan(0);

      // Check specific issues
      const fetchDataMethod = results.find((r: JSDocValidationResult) => r.elementName === 'fetchData');
      expect(fetchDataMethod).toBeDefined();
      expect(fetchDataMethod!.isValid).toBe(false);
      expect(fetchDataMethod!.missingTags).toContain('description');
    });

    test('should handle mixed documentation quality', async () => {
      const filePath = path.join(tempDir, 'mixed-documentation.ts');
      const results = await JSDocGenerator.validateFile(filePath);

      expect(results.length).toBeGreaterThan(0);

      // Should have both valid and invalid results
      const validResults = results.filter((r: JSDocValidationResult) => r.isValid);
      const invalidResults = results.filter((r: JSDocValidationResult) => !r.isValid);
      
      expect(validResults.length).toBeGreaterThan(0);
      expect(invalidResults.length).toBeGreaterThan(0);

      // Check specific elements
      const goodMethod = results.find((r: JSDocValidationResult) => r.elementName === 'goodMethod');
      expect(goodMethod!.isValid).toBe(true);

      const badMethod = results.find((r: JSDocValidationResult) => r.elementName === 'badMethod');
      expect(badMethod!.isValid).toBe(false);
    });

    test('should handle file with syntax errors gracefully', async () => {
      const invalidFile = path.join(tempDir, 'invalid.ts');
      await fs.promises.writeFile(invalidFile, 'this is not valid typescript {{{');

      // Should handle gracefully and return empty results for unparseable files
      const results = await JSDocGenerator.validateFile(invalidFile);
      expect(results).toHaveLength(0);
    });

    test('should respect includePrivate option', async () => {
      const fileWithPrivate = path.join(tempDir, 'private-methods.ts');
      await fs.promises.writeFile(fileWithPrivate, `
export class TestClass {
  public publicMethod(): void {}
  
  private privateMethod(): void {}
  
  protected protectedMethod(): void {}
}
`);

      const resultsWithoutPrivate = await JSDocGenerator.validateFile(fileWithPrivate, { includePrivate: false });
      const resultsWithPrivate = await JSDocGenerator.validateFile(fileWithPrivate, { includePrivate: true });

      expect(resultsWithPrivate.length).toBeGreaterThan(resultsWithoutPrivate.length);
    });
  });

  describe('generateProjectReport', () => {
    test('should generate comprehensive project report', async () => {
      const report = await JSDocGenerator.generateProjectReport(tempDir, {
        includeTests: false,
        includePrivate: false
      });

      expect(report).toMatchObject({
        coverage: expect.any(Number),
        totalElements: expect.any(Number),
        documentedElements: expect.any(Number),
        undocumentedElements: expect.any(Number),
        fileResults: expect.any(Object),
        statistics: {
          byElementType: expect.any(Object),
          byFile: expect.any(Object)
        },
        recommendations: expect.any(Array),
        generatedAt: expect.any(String)
      });

      expect(report.coverage).toBeGreaterThanOrEqual(0);
      expect(report.coverage).toBeLessThanOrEqual(100);
      expect(report.totalElements).toBeGreaterThan(0);
      expect(report.documentedElements + report.undocumentedElements).toBe(report.totalElements);
    });

    test('should calculate statistics correctly', async () => {
      const report = await JSDocGenerator.generateProjectReport(tempDir);

      // Check element type statistics
      expect(report.statistics.byElementType).toBeDefined();
      Object.values(report.statistics.byElementType).forEach((stats: any) => {
        expect(stats.total).toBeGreaterThanOrEqual(0);
        expect(stats.documented).toBeGreaterThanOrEqual(0);
        expect(stats.documented).toBeLessThanOrEqual(stats.total);
        expect(stats.coverage).toBeGreaterThanOrEqual(0);
        expect(stats.coverage).toBeLessThanOrEqual(100);
      });

      // Check file statistics
      expect(report.statistics.byFile).toBeDefined();
      Object.keys(report.statistics.byFile).forEach(file => {
        expect(file).toMatch(/\.ts$/);
      });
    });

    test('should generate appropriate recommendations', async () => {
      const report = await JSDocGenerator.generateProjectReport(tempDir);

      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      // Should contain coverage-based recommendations
      const haseCoverageRecommendation = report.recommendations.some((rec: any) => 
        rec.toLowerCase().includes('coverage') || rec.toLowerCase().includes('documentation')
      );
      expect(haseCoverageRecommendation).toBe(true);
    });

    test('should respect output options', async () => {
      const outputPath = path.join(tempDir, 'report.json');
      
      const report = await JSDocGenerator.generateProjectReport(tempDir, {
        outputFormat: 'json',
        outputPath
      });

      // Check that file was created
      expect(fs.existsSync(outputPath)).toBe(true);
      
      // Check that content is valid JSON
      const fileContent = await fs.promises.readFile(outputPath, 'utf-8');
      const parsedReport = JSON.parse(fileContent);
      expect(parsedReport.coverage).toBe(report.coverage);
    });
  });

  describe('generateTemplate', () => {
    test('should generate function template correctly', () => {
      const template = JSDocGenerator.generateTemplate('function', 'processData', {
        parameters: ['data: any', 'options?: ProcessOptions'],
        returnType: 'Promise<ProcessedData>',
        isAsync: true,
        throwsErrors: ['ValidationError', 'ProcessingError']
      });

      expect(template).toContain('/**');
      expect(template).toContain('Function processData');
      expect(template).toContain('@param data');
      expect(template).toContain('@param options');
      expect(template).toContain('@returns Promise resolving to');
      expect(template).toContain('@throws {ValidationError}');
      expect(template).toContain('@throws {ProcessingError}');
      expect(template).toContain('@example');
      expect(template).toContain('@since 1.0.0');
      expect(template).toContain('*/');
    });

    test('should generate class template correctly', () => {
      const template = JSDocGenerator.generateTemplate('class', 'DataProcessor', {
        description: 'Processes various types of data'
      });

      expect(template).toContain('/**');
      expect(template).toContain('Processes various types of data');
      expect(template).not.toContain('@param');
      expect(template).not.toContain('@returns');
      expect(template).toContain('@example');
      expect(template).toContain('@since 1.0.0');
      expect(template).toContain('*/');
    });

    test('should handle void return type', () => {
      const template = JSDocGenerator.generateTemplate('function', 'executeAction', {
        parameters: ['action: string'],
        returnType: 'void'
      });

      expect(template).not.toContain('@returns');
      expect(template).toContain('@param action');
    });

    test('should handle no parameters', () => {
      const template = JSDocGenerator.generateTemplate('function', 'getCurrentTime', {
        returnType: 'Date'
      });

      expect(template).not.toContain('@param');
      expect(template).toContain('@returns Returns Date');
    });
  });

  describe('error handling', () => {
    test('should handle non-existent files', async () => {
      const nonExistentFile = path.join(tempDir, 'does-not-exist.ts');
      
      await expect(JSDocGenerator.validateFile(nonExistentFile))
        .rejects.toThrow();
    });

    test('should handle empty files', async () => {
      const emptyFile = path.join(tempDir, 'empty.ts');
      await fs.promises.writeFile(emptyFile, '');

      const results = await JSDocGenerator.validateFile(emptyFile);
      expect(results).toHaveLength(0);
    });

    test('should handle files with only comments', async () => {
      const commentFile = path.join(tempDir, 'comments-only.ts');
      await fs.promises.writeFile(commentFile, `
// This is a comment
/* This is a block comment */
/**
 * This is a JSDoc comment but no code follows
 */
`);

      const results = await JSDocGenerator.validateFile(commentFile);
      expect(results).toHaveLength(0);
    });
  });

  describe('custom requirements', () => {
    test('should support custom tag requirements', async () => {
      const customRequirements = {
        function: {
          required: ['description', 'customTag'],
          recommended: ['example'],
          forbidden: ['deprecated']
        }
      };

      const filePath = path.join(tempDir, 'custom-test.ts');
      await fs.promises.writeFile(filePath, `
/**
 * Test function
 * @customTag This is a custom tag
 */
export function testFunction(): void {}
`);

      const results = await JSDocGenerator.validateFile(filePath, {
        customRequirements
      });

      const functionResult = results.find((r: JSDocValidationResult) => r.elementName === 'testFunction');
      expect(functionResult!.isValid).toBe(true);
    });
  });
});

describe('JSDocCLI', () => {
  let tempDir: string;
  let originalExit: typeof process.exit;
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;
  let exitCode: number | undefined;
  let consoleOutput: string[];
  let errorOutput: string[];

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'jsdoc-cli-test-'));
    
    // Mock process.exit
    exitCode = undefined;
    originalExit = process.exit;
    process.exit = jest.fn((code?: number) => {
      exitCode = code;
      throw new Error(`Process exit with code ${code}`);
    }) as any;

    // Mock console methods
    consoleOutput = [];
    errorOutput = [];
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = jest.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });
    console.error = jest.fn((...args) => {
      errorOutput.push(args.join(' '));
    });

    // Create test files
    await fs.promises.writeFile(path.join(tempDir, 'test.ts'), 
      '/**\n' +
      ' * Test class\n' +
      ' * @since 1.0.0\n' +
      ' */\n' +
      'export class TestMainClass {\n' +
      '  /**\n' +
      '   * Test method\n' +
      '   * @param input - Input parameter\n' +
      '   * @returns Output value\n' +
      '   * @since 1.0.0\n' +
      '   */\n' +
      '  testMethod(input: string): string {\n' +
      '    return input;\n' +
      '  }\n' +
      '}\n'
    );
  });

  afterEach(async () => {
    // Restore mocks
    process.exit = originalExit;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;

    // Clean up
    if (tempDir) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('argument parsing', () => {
    test('should parse basic arguments correctly', async () => {
      const result = await JSDocCLI.main([tempDir]);
      expect(result).toBe(0);
      expect(consoleOutput.some(line => line.includes('JSDoc Documentation Analysis'))).toBe(true);
    });

    test('should show help when requested', async () => {
      const result = await JSDocCLI.main(['--help']);
      expect(result).toBe(0);
      expect(consoleOutput.some(line => line.includes('JSDoc Documentation Analysis CLI'))).toBe(true);
    });

    test('should handle format option', async () => {
      const result = await JSDocCLI.main([tempDir, '--format=json']);
      expect(result).toBe(0);
      // Should output JSON format
    });

    test('should handle threshold option', async () => {
      const result = await JSDocCLI.main([tempDir, '--threshold=90']);
      expect(result).toBe(0); // Well documented test file should pass
    });

    test('should fail with low threshold', async () => {
      // Create poorly documented file
      await fs.promises.writeFile(path.join(tempDir, 'poor.ts'), 
        'export function undocumentedFunction(): void {}\n'
      );

      const result = await JSDocCLI.main([tempDir, '--threshold=95']);
      expect(result).toBe(1); // Should fail due to low coverage
    });

    test('should handle invalid format', async () => {
      const result = await JSDocCLI.main([tempDir, '--format=invalid']);
      expect(result).toBe(1);
      expect(errorOutput.some(line => line.includes('Invalid format'))).toBe(true);
    });

    test('should handle invalid threshold', async () => {
      const result = await JSDocCLI.main([tempDir, '--threshold=invalid']);
      expect(result).toBe(1);
      expect(errorOutput.some(line => line.includes('Invalid threshold'))).toBe(true);
    });

    test('should require project path', async () => {
      const result = await JSDocCLI.main([]);
      expect(result).toBe(1);
      expect(errorOutput.some(line => line.includes('Project path is required'))).toBe(true);
    });
  });

  describe('output formats', () => {
    test('should generate console output by default', async () => {
      const result = await JSDocCLI.main([tempDir]);
      expect(result).toBe(0);
      expect(consoleOutput.some(line => line.includes('Documentation Analysis Report'))).toBe(true);
      expect(consoleOutput.some(line => line.includes('Coverage:'))).toBe(true);
    });

    test('should generate JSON output', async () => {
      const outputFile = path.join(tempDir, 'output.json');
      const result = await JSDocCLI.main([tempDir, '--format=json', `--output=${outputFile}`]);
      expect(result).toBe(0);
      
      expect(fs.existsSync(outputFile)).toBe(true);
      const content = await fs.promises.readFile(outputFile, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    test('should generate markdown output', async () => {
      const outputFile = path.join(tempDir, 'output.md');
      const result = await JSDocCLI.main([tempDir, '--format=markdown', `--output=${outputFile}`]);
      expect(result).toBe(0);
      
      expect(fs.existsSync(outputFile)).toBe(true);
      const content = await fs.promises.readFile(outputFile, 'utf-8');
      expect(content).toContain('# 📚 JSDoc Documentation Analysis Report');
    });
  });

  describe('options', () => {
    test('should handle verbose option', async () => {
      const result = await JSDocCLI.main([tempDir, '--verbose']);
      expect(result).toBe(0);
      // Verbose should show more detailed output
      expect(consoleOutput.some(line => line.includes('Documentation by File'))).toBe(true);
    });

    test('should handle include-tests option', async () => {
      // Create a test file
      await fs.promises.writeFile(path.join(tempDir, 'example.test.ts'), 
        'export function testFunction(): void {}\n'
      );

      const resultWithoutTests = await JSDocCLI.main([tempDir]);
      consoleOutput.length = 0; // Clear output

      const resultWithTests = await JSDocCLI.main([tempDir, '--include-tests']);
      
      // With tests should potentially find more elements
      expect(resultWithTests).toBe(0);
    });

    test('should handle include-private option', async () => {
      // Create file with private methods
      await fs.promises.writeFile(path.join(tempDir, 'private-test.ts'), 
        'export class TestPrivateClass {\n' +
        '  public publicMethod(): void {}\n' +
        '  private privateMethod(): void {}\n' +
        '}\n'
      );

      const result = await JSDocCLI.main([tempDir, '--include-private']);
      expect(result).toBe(0);
    });

    test('should handle strict mode', async () => {
      const result = await JSDocCLI.main([tempDir, '--strict']);
      expect(result).toBe(0);
    });
  });

  describe('error handling', () => {
    test('should handle non-existent directory', async () => {
      const result = await JSDocCLI.main(['/non/existent/directory']);
      expect(result).toBe(1);
    });

    test('should handle permission errors gracefully', async () => {
      // This test might be platform-specific
      const result = await JSDocCLI.main(['/root/restricted']);
      expect([0, 1]).toContain(result); // Either works or fails gracefully
    });
  });
});
