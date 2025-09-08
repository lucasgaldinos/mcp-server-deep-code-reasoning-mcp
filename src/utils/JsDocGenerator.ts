/**
 * JSDoc Documentation Generator and Validator for Deep Code Reasoning MCP Server
 * 
 * This module provides comprehensive JSDoc documentation generation, validation,
 * and enforcement for consistent API documentation across the codebase.
 * Supports TypeScript-specific JSDoc patterns and MCP server requirements.
 * 
 * @author Deep Code Reasoning MCP Team
 * @version 1.0.0
 * @since 2024
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/**
 * JSDoc tag definitions for different code elements
 */
export interface JSDocTagRequirements {
  /** Required tags for this element type */
  required: string[];
  /** Optional but recommended tags */
  recommended: string[];
  /** Tags that are not allowed for this element type */
  forbidden: string[];
  /** Custom validation rules for tag content */
  validators?: Record<string, (content: string) => boolean>;
}

/**
 * JSDoc validation result for a single code element
 */
export interface JSDocValidationResult {
  /** Whether the JSDoc meets requirements */
  isValid: boolean;
  /** Element being validated */
  elementName: string;
  /** Element type (function, class, interface, etc.) */
  elementType: 'function' | 'class' | 'interface' | 'method' | 'property' | 'type' | 'variable';
  /** File path where element is located */
  filePath: string;
  /** Line number of the element */
  lineNumber: number;
  /** Missing required tags */
  missingTags: string[];
  /** Invalid tag content */
  invalidTags: Array<{ tag: string; reason: string }>;
  /** Suggested improvements */
  suggestions: string[];
  /** Current JSDoc comment if present */
  currentDoc?: string;
  /** Generated JSDoc template */
  suggestedDoc?: string;
}

/**
 * Project-wide JSDoc analysis report
 */
export interface JSDocReport {
  /** Overall documentation coverage percentage */
  coverage: number;
  /** Total elements analyzed */
  totalElements: number;
  /** Elements with proper documentation */
  documentedElements: number;
  /** Elements missing documentation */
  undocumentedElements: number;
  /** Validation results per file */
  fileResults: Record<string, JSDocValidationResult[]>;
  /** Summary statistics */
  statistics: {
    byElementType: Record<string, { total: number; documented: number; coverage: number }>;
    byFile: Record<string, { total: number; documented: number; coverage: number }>;
  };
  /** Improvement recommendations */
  recommendations: string[];
  /** Generated at timestamp */
  generatedAt: string;
}

/**
 * Comprehensive JSDoc documentation system for MCP server
 */
export class JSDocGenerator {
  private static readonly DEFAULT_TAG_REQUIREMENTS: Record<string, JSDocTagRequirements> = {
    function: {
      required: ['description', 'param', 'returns'],
      recommended: ['example', 'throws', 'since'],
      forbidden: ['constructor']
    },
    method: {
      required: ['description', 'param', 'returns'],
      recommended: ['example', 'throws', 'override'],
      forbidden: ['constructor']
    },
    class: {
      required: ['description'],
      recommended: ['example', 'since', 'author'],
      forbidden: ['param', 'returns']
    },
    interface: {
      required: ['description'],
      recommended: ['example', 'since'],
      forbidden: ['param', 'returns', 'constructor']
    },
    property: {
      required: ['description'],
      recommended: ['example', 'default'],
      forbidden: ['param', 'returns', 'constructor']
    },
    type: {
      required: ['description'],
      recommended: ['example'],
      forbidden: ['param', 'returns', 'constructor']
    },
    variable: {
      required: ['description'],
      recommended: ['example', 'default'],
      forbidden: ['constructor']
    }
  };

  private static readonly MCP_SPECIFIC_TAGS = {
    mcpTool: {
      required: ['description', 'param', 'returns', 'mcpSchema'],
      recommended: ['example', 'mcpPermissions', 'mcpVersion'],
      forbidden: []
    },
    mcpResource: {
      required: ['description', 'mcpUri', 'mcpMimeType'],
      recommended: ['example', 'mcpVersion'],
      forbidden: ['param', 'returns']
    },
    mcpPrompt: {
      required: ['description', 'mcpArguments'],
      recommended: ['example', 'mcpVersion'],
      forbidden: ['returns']
    }
  };

  /**
   * Validates JSDoc documentation for a TypeScript file
   * 
   * @param filePath - Absolute path to the TypeScript file
   * @param options - Validation options
   * @returns Promise resolving to validation results
   * 
   * @example
   * ```typescript
   * const results = await JSDocGenerator.validateFile('./src/index.ts');
   * console.log(`Coverage: ${results.length} issues found`);
   * ```
   * 
   * @throws {Error} When file cannot be read or parsed
   * @since 1.0.0
   */
  static async validateFile(
    filePath: string,
    options: {
      includePrivate?: boolean;
      strictMode?: boolean;
      customRequirements?: Record<string, JSDocTagRequirements>;
    } = {}
  ): Promise<JSDocValidationResult[]> {
    try {
      const sourceCode = await fs.promises.readFile(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const results: JSDocValidationResult[] = [];
      const requirements = {
        ...this.DEFAULT_TAG_REQUIREMENTS,
        ...this.MCP_SPECIFIC_TAGS,
        ...options.customRequirements
      };

      // Traverse the AST to find documentable elements
      const visit = (node: ts.Node) => {
        const validation = this.validateNode(node, sourceFile, requirements, options);
        if (validation) {
          results.push(validation);
        }
        // Continue traversing child nodes
        node.forEachChild(visit);
      };

      visit(sourceFile);
      return results;
    } catch (error) {
      throw new Error(`Failed to validate JSDoc in ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates comprehensive project-wide JSDoc report
   * 
   * @param projectRoot - Root directory of the project
   * @param options - Report generation options
   * @returns Promise resolving to complete JSDoc report
   * 
   * @example
   * ```typescript
   * const report = await JSDocGenerator.generateProjectReport('./src');
   * console.log(`Project documentation coverage: ${report.coverage}%`);
   * ```
   * 
   * @throws {Error} When project directory cannot be accessed
   * @since 1.0.0
   */
  static async generateProjectReport(
    projectRoot: string,
    options: {
      includeTests?: boolean;
      includePrivate?: boolean;
      strictMode?: boolean;
      outputFormat?: 'json' | 'markdown' | 'console';
      outputPath?: string;
    } = {}
  ): Promise<JSDocReport> {
    const tsFiles = await this.findTypeScriptFiles(projectRoot, options.includeTests);
    const allResults: JSDocValidationResult[] = [];
    const fileResults: Record<string, JSDocValidationResult[]> = {};

    // Validate each file
    for (const file of tsFiles) {
      try {
        const results = await this.validateFile(file, options);
        allResults.push(...results);
        fileResults[file] = results;
      } catch (error) {
        console.warn(`Skipping file ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Calculate statistics
    const totalElements = allResults.length;
    const documentedElements = allResults.filter(r => r.isValid).length;
    const coverage = totalElements > 0 ? Math.round((documentedElements / totalElements) * 100) : 100;

    // Generate statistics by element type
    const byElementType: Record<string, { total: number; documented: number; coverage: number }> = {};
    const byFile: Record<string, { total: number; documented: number; coverage: number }> = {};

    for (const result of allResults) {
      // By element type
      if (!byElementType[result.elementType]) {
        byElementType[result.elementType] = { total: 0, documented: 0, coverage: 0 };
      }
      byElementType[result.elementType].total++;
      if (result.isValid) {
        byElementType[result.elementType].documented++;
      }

      // By file
      if (!byFile[result.filePath]) {
        byFile[result.filePath] = { total: 0, documented: 0, coverage: 0 };
      }
      byFile[result.filePath].total++;
      if (result.isValid) {
        byFile[result.filePath].documented++;
      }
    }

    // Calculate coverage percentages
    Object.keys(byElementType).forEach(type => {
      const stats = byElementType[type];
      stats.coverage = stats.total > 0 ? Math.round((stats.documented / stats.total) * 100) : 100;
    });

    Object.keys(byFile).forEach(file => {
      const stats = byFile[file];
      stats.coverage = stats.total > 0 ? Math.round((stats.documented / stats.total) * 100) : 100;
    });

    const report: JSDocReport = {
      coverage,
      totalElements,
      documentedElements,
      undocumentedElements: totalElements - documentedElements,
      fileResults,
      statistics: { byElementType, byFile },
      recommendations: this.generateRecommendations(allResults, coverage),
      generatedAt: new Date().toISOString()
    };

    // Output report if requested
    if (options.outputPath) {
      await this.outputReport(report, options.outputFormat || 'json', options.outputPath);
    }

    return report;
  }

  /**
   * Generates JSDoc template for a code element
   * 
   * @param elementType - Type of code element
   * @param elementName - Name of the element
   * @param signature - Function/method signature if applicable
   * @param options - Template generation options
   * @returns Generated JSDoc template string
   * 
   * @example
   * ```typescript
   * const template = JSDocGenerator.generateTemplate('function', 'getUserData', {
   *   parameters: ['userId: string', 'options?: GetUserOptions'],
   *   returnType: 'Promise<UserData>'
   * });
   * ```
   * 
   * @since 1.0.0
   */
  static generateTemplate(
    elementType: string,
    elementName: string,
    options: {
      parameters?: string[];
      returnType?: string;
      description?: string;
      isAsync?: boolean;
      throwsErrors?: string[];
    } = {}
  ): string {
    const lines: string[] = ['/**'];
    
    // Description
    const description = options.description || `${this.capitalizeFirst(elementType)} ${elementName}`;
    lines.push(` * ${description}`);
    lines.push(' *');

    // Parameters
    if (options.parameters && options.parameters.length > 0) {
      options.parameters.forEach(param => {
        const [name, type] = param.split(':').map(s => s.trim());
        const isOptional = name.includes('?');
        const cleanName = name.replace('?', '');
        lines.push(` * @param ${cleanName} - Description for ${cleanName}`);
      });
    }

    // Return type
    if (options.returnType && options.returnType !== 'void') {
      const description = options.isAsync ? 'Promise resolving to' : 'Returns';
      lines.push(` * @returns ${description} ${options.returnType}`);
    }

    // Throws
    if (options.throwsErrors && options.throwsErrors.length > 0) {
      options.throwsErrors.forEach(error => {
        lines.push(` * @throws {${error}} When error condition occurs`);
      });
    }

    // Example placeholder
    lines.push(' *');
    lines.push(' * @example');
    lines.push(' * ```typescript');
    lines.push(` * // Usage example for ${elementName}`);
    lines.push(' * ```');
    lines.push(' *');
    lines.push(' * @since 1.0.0');
    lines.push(' */');

    return lines.join('\n');
  }

  /**
   * Validates a single AST node for JSDoc compliance
   * 
   * @param node - TypeScript AST node to validate
   * @param sourceFile - Source file containing the node
   * @param requirements - JSDoc requirements for different element types
   * @param options - Validation options
   * @returns Validation result or null if node should be skipped
   * 
   * @private
   * @since 1.0.0
   */
  private static validateNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    requirements: Record<string, JSDocTagRequirements>,
    options: any
  ): JSDocValidationResult | null {
    // Determine if this node needs documentation
    const elementInfo = this.getElementInfo(node);
    if (!elementInfo) return null;

    // Skip private elements unless requested
    if (!options.includePrivate && elementInfo.isPrivate) return null;

    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const jsDocComment = this.extractJSDocComment(node);
    const reqs = requirements[elementInfo.type] || requirements.function;

    // Validate JSDoc presence and content
    const isValid = this.isValidJSDoc(jsDocComment, reqs);
    const missingTags = this.findMissingTags(jsDocComment, reqs.required);
    const invalidTags = this.findInvalidTags(jsDocComment, reqs);
    const suggestions = this.generateSuggestions(elementInfo, missingTags, invalidTags);
    const suggestedDoc = this.generateSuggestedDoc(elementInfo, node);

    return {
      isValid,
      elementName: elementInfo.name,
      elementType: elementInfo.type as any,
      filePath: sourceFile.fileName,
      lineNumber: line + 1,
      missingTags,
      invalidTags,
      suggestions,
      currentDoc: jsDocComment || undefined,
      suggestedDoc
    };
  }

  /**
   * Extracts element information from TypeScript AST node
   * 
   * @param node - TypeScript AST node
   * @returns Element information or null if not documentable
   * 
   * @private
   * @since 1.0.0
   */
  private static getElementInfo(node: ts.Node): {
    name: string;
    type: string;
    isPrivate: boolean;
    signature?: string;
  } | null {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return {
        name: node.name.text,
        type: 'function',
        isPrivate: false
      };
    }

    if (ts.isMethodDeclaration(node) && node.name) {
      const isPrivate = node.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword) || false;
      return {
        name: ts.isIdentifier(node.name) ? node.name.text : 'method',
        type: 'method',
        isPrivate
      };
    }

    if (ts.isClassDeclaration(node) && node.name) {
      return {
        name: node.name.text,
        type: 'class',
        isPrivate: false
      };
    }

    if (ts.isInterfaceDeclaration(node)) {
      return {
        name: node.name.text,
        type: 'interface',
        isPrivate: false
      };
    }

    if (ts.isPropertyDeclaration(node) && node.name) {
      const isPrivate = node.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword) || false;
      return {
        name: ts.isIdentifier(node.name) ? node.name.text : 'property',
        type: 'property',
        isPrivate
      };
    }

    if (ts.isTypeAliasDeclaration(node)) {
      return {
        name: node.name.text,
        type: 'type',
        isPrivate: false
      };
    }

    if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
      return {
        name: node.name.text,
        type: 'variable',
        isPrivate: false
      };
    }

    return null;
  }

  /**
   * Extracts JSDoc comment from AST node
   * 
   * @param node - TypeScript AST node
   * @returns JSDoc comment text or null if none exists
   * 
   * @private
   * @since 1.0.0
   */
  private static extractJSDocComment(node: ts.Node): string | null {
    // Check for JSDoc tags on the node
    const jsDocTags = ts.getJSDocTags(node);
    if (jsDocTags && jsDocTags.length > 0) {
      // Node has JSDoc, reconstruct the comment
      const sourceFile = node.getSourceFile();
      const start = node.getFullStart();
      const fullText = sourceFile.getFullText();
      
      // Look for JSDoc comment before the node
      const textBeforeNode = fullText.substring(start, node.getStart());
      const jsDocMatch = textBeforeNode.match(/\/\*\*([\s\S]*?)\*\//);
      if (jsDocMatch) {
        return jsDocMatch[0];
      }
    }

    // Alternative approach: look for JSDoc in the leading trivia
    const sourceFile = node.getSourceFile();
    const nodeStart = node.getFullStart();
    const nodeActualStart = node.getStart();
    const leadingTrivia = sourceFile.getFullText().substring(nodeStart, nodeActualStart);
    
    const jsDocMatch = leadingTrivia.match(/\/\*\*([\s\S]*?)\*\//);
    return jsDocMatch ? jsDocMatch[0] : null;
  }

  /**
   * Validates JSDoc comment against requirements
   * 
   * @param jsDoc - JSDoc comment text
   * @param requirements - Requirements for this element type
   * @returns Whether JSDoc meets requirements
   * 
   * @private
   * @since 1.0.0
   */
  private static isValidJSDoc(jsDoc: string | null, requirements: JSDocTagRequirements): boolean {
    if (!jsDoc) return false;

    // Check for required tags
    const hasAllRequired = requirements.required.every(tag => {
      if (tag === 'description') {
        // For description, check if there's text after /** and before first @tag
        const descMatch = jsDoc.match(/\/\*\*\s*([\s\S]*?)(?:\s*@|\*\/)/);
        if (descMatch && descMatch[1].trim()) {
          return true;
        }
        return false;
      } else {
        const pattern = new RegExp(`@${tag}`, 'i');
        return pattern.test(jsDoc);
      }
    });

    return hasAllRequired;
  }

  /**
   * Finds missing required JSDoc tags
   * 
   * @param jsDoc - JSDoc comment text
   * @param requiredTags - List of required tags
   * @returns Array of missing tag names
   * 
   * @private
   * @since 1.0.0
   */
  private static findMissingTags(jsDoc: string | null, requiredTags: string[]): string[] {
    if (!jsDoc) return [...requiredTags];

    return requiredTags.filter(tag => {
      if (tag === 'description') {
        // For description, check if there's text after /** and before first @tag
        const descMatch = jsDoc.match(/\/\*\*\s*([\s\S]*?)(?:\s*@|\*\/)/);
        return !(descMatch && descMatch[1].trim().replace(/\*/g, '').trim());
      } else {
        const pattern = new RegExp(`@${tag}`, 'i');
        return !pattern.test(jsDoc);
      }
    });
  }

  /**
   * Finds invalid JSDoc tags
   * 
   * @param jsDoc - JSDoc comment text
   * @param requirements - Requirements for this element type
   * @returns Array of invalid tags with reasons
   * 
   * @private
   * @since 1.0.0
   */
  private static findInvalidTags(jsDoc: string | null, requirements: JSDocTagRequirements): Array<{ tag: string; reason: string }> {
    if (!jsDoc) return [];

    const invalid: Array<{ tag: string; reason: string }> = [];

    // Check for forbidden tags
    requirements.forbidden.forEach(tag => {
      const pattern = new RegExp(`@${tag}`, 'i');
      if (pattern.test(jsDoc)) {
        invalid.push({ tag, reason: `Tag @${tag} is not allowed for this element type` });
      }
    });

    return invalid;
  }

  /**
   * Generates improvement suggestions
   * 
   * @param elementInfo - Information about the code element
   * @param missingTags - List of missing required tags
   * @param invalidTags - List of invalid tags
   * @returns Array of suggestion strings
   * 
   * @private
   * @since 1.0.0
   */
  private static generateSuggestions(
    elementInfo: any,
    missingTags: string[],
    invalidTags: Array<{ tag: string; reason: string }>
  ): string[] {
    const suggestions: string[] = [];

    if (missingTags.length > 0) {
      suggestions.push(`Add missing JSDoc tags: ${missingTags.join(', ')}`);
    }

    if (invalidTags.length > 0) {
      suggestions.push(`Remove invalid tags: ${invalidTags.map(t => t.tag).join(', ')}`);
    }

    if (elementInfo.type === 'function' || elementInfo.type === 'method') {
      suggestions.push('Include @example with usage demonstration');
      suggestions.push('Document @throws for potential error conditions');
    }

    if (elementInfo.type === 'class' || elementInfo.type === 'interface') {
      suggestions.push('Add @since tag to indicate when this was introduced');
    }

    return suggestions;
  }

  /**
   * Generates suggested JSDoc for an element
   * 
   * @param elementInfo - Information about the code element
   * @param node - TypeScript AST node
   * @returns Generated JSDoc template
   * 
   * @private
   * @since 1.0.0
   */
  private static generateSuggestedDoc(elementInfo: any, node: ts.Node): string {
    return this.generateTemplate(elementInfo.type, elementInfo.name, {
      description: `${this.capitalizeFirst(elementInfo.type)} ${elementInfo.name}`
    });
  }

  /**
   * Finds all TypeScript files in a directory
   * 
   * @param dir - Directory to search
   * @param includeTests - Whether to include test files
   * @returns Array of TypeScript file paths
   * 
   * @private
   * @since 1.0.0
   */
  private static async findTypeScriptFiles(dir: string, includeTests = false): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...await this.findTypeScriptFiles(fullPath, includeTests));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        if (includeTests || !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Generates improvement recommendations based on analysis results
   * 
   * @param results - All validation results
   * @param coverage - Overall coverage percentage
   * @returns Array of recommendation strings
   * 
   * @private
   * @since 1.0.0
   */
  private static generateRecommendations(results: JSDocValidationResult[], coverage: number): string[] {
    const recommendations: string[] = [];

    if (coverage < 50) {
      recommendations.push('CRITICAL: Documentation coverage is very low. Consider implementing JSDoc requirements in CI/CD.');
    } else if (coverage < 80) {
      recommendations.push('Documentation coverage needs improvement. Focus on public APIs first.');
    } else if (coverage < 95) {
      recommendations.push('Good documentation coverage! Address remaining gaps for excellence.');
    } else {
      recommendations.push('Excellent documentation coverage! Maintain this standard.');
    }

    // Find common issues
    const commonMissing = this.findCommonMissingTags(results);
    if (commonMissing.length > 0) {
      recommendations.push(`Most commonly missing tags: ${commonMissing.join(', ')}`);
    }

    // File-specific recommendations
    const fileIssues = this.findFilesWithMostIssues(results);
    if (fileIssues.length > 0) {
      recommendations.push(`Files needing attention: ${fileIssues.slice(0, 3).join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Finds most commonly missing JSDoc tags
   * 
   * @param results - Validation results
   * @returns Array of commonly missing tag names
   * 
   * @private
   * @since 1.0.0
   */
  private static findCommonMissingTags(results: JSDocValidationResult[]): string[] {
    const tagCounts: Record<string, number> = {};
    
    results.forEach(result => {
      result.missingTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);
  }

  /**
   * Finds files with the most documentation issues
   * 
   * @param results - Validation results
   * @returns Array of file paths with most issues
   * 
   * @private
   * @since 1.0.0
   */
  private static findFilesWithMostIssues(results: JSDocValidationResult[]): string[] {
    const fileCounts: Record<string, number> = {};
    
    results.forEach(result => {
      if (!result.isValid) {
        fileCounts[result.filePath] = (fileCounts[result.filePath] || 0) + 1;
      }
    });

    return Object.entries(fileCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([file]) => path.basename(file));
  }

  /**
   * Outputs JSDoc report in specified format
   * 
   * @param report - JSDoc report to output
   * @param format - Output format
   * @param outputPath - Path to write output file
   * 
   * @private
   * @since 1.0.0
   */
  private static async outputReport(report: JSDocReport, format: string, outputPath: string): Promise<void> {
    let content: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(report, null, 2);
        break;
      case 'markdown':
        content = this.generateMarkdownReport(report);
        break;
      default:
        content = this.generateConsoleReport(report);
    }

    await fs.promises.writeFile(outputPath, content, 'utf-8');
  }

  /**
   * Generates markdown format report
   * 
   * @param report - JSDoc report
   * @returns Markdown formatted report string
   * 
   * @private
   * @since 1.0.0
   */
  private static generateMarkdownReport(report: JSDocReport): string {
    const lines: string[] = [];
    
    lines.push('# 📚 JSDoc Documentation Analysis Report');
    lines.push('');
    lines.push(`**Generated:** ${report.generatedAt}`);
    lines.push(`**Coverage:** ${report.coverage}%`);
    lines.push(`**Total Elements:** ${report.totalElements}`);
    lines.push(`**Documented:** ${report.documentedElements}`);
    lines.push(`**Missing Documentation:** ${report.undocumentedElements}`);
    lines.push('');

    lines.push('## Statistics by Element Type');
    lines.push('');
    Object.entries(report.statistics.byElementType).forEach(([type, stats]) => {
      lines.push(`- **${type}:** ${stats.coverage}% (${stats.documented}/${stats.total})`);
    });
    lines.push('');

    lines.push('## Recommendations');
    lines.push('');
    report.recommendations.forEach(rec => {
      lines.push(`- ${rec}`);
    });

    return lines.join('\n');
  }

  /**
   * Generates console format report
   * 
   * @param report - JSDoc report
   * @returns Console formatted report string
   * 
   * @private
   * @since 1.0.0
   */
  private static generateConsoleReport(report: JSDocReport): string {
    const lines: string[] = [];
    
    lines.push('JSDoc Documentation Report');
    lines.push('========================');
    lines.push(`Coverage: ${report.coverage}%`);
    lines.push(`Total Elements: ${report.totalElements}`);
    lines.push(`Documented: ${report.documentedElements}`);
    lines.push(`Missing Documentation: ${report.undocumentedElements}`);
    lines.push('');

    lines.push('Statistics by Element Type:');
    Object.entries(report.statistics.byElementType).forEach(([type, stats]) => {
      lines.push(`  ${type}: ${stats.coverage}% (${stats.documented}/${stats.total})`);
    });
    lines.push('');

    lines.push('Recommendations:');
    report.recommendations.forEach(rec => {
      lines.push(`  - ${rec}`);
    });

    return lines.join('\n');
  }

  /**
   * Capitalizes first letter of a string
   * 
   * @param str - String to capitalize
   * @returns Capitalized string
   * 
   * @private
   * @since 1.0.0
   */
  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Re-export interfaces for convenience
export type JSDocTagRequirementsType = JSDocTagRequirements;
export type JSDocValidationResultType = JSDocValidationResult;
export type JSDocReportType = JSDocReport;
