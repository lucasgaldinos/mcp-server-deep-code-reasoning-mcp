#!/usr/bin/env tsx

/**
 * Instruction File Validation Script
 * 
 * Validates instruction files for:
 * - File reference accuracy
 * - Repository name consistency
 * - Duplicate content detection
 * - Formatting standards
 * - Required sections presence
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface ValidationResult {
  file: string;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
}

interface ValidationIssue {
  type: string;
  message: string;
  line?: number;
  severity: 'error' | 'warning';
}

class InstructionValidator {
  private readonly repoName = 'mcp-server-deep-code-reasoning-mcp';
  private readonly instructionsDir = '.github/instructions';
  private readonly rootDir = process.cwd();

  public validateAll(): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    if (!existsSync(this.instructionsDir)) {
      console.error(`Instructions directory not found: ${this.instructionsDir}`);
      return results;
    }

    const files = readdirSync(this.instructionsDir)
      .filter(file => file.endsWith('.instructions.md'))
      .map(file => join(this.instructionsDir, file));

    for (const file of files) {
      results.push(this.validateFile(file));
    }

    // Check for duplicate content
    this.checkForDuplicates(results);

    return results;
  }

  private validateFile(filePath: string): ValidationResult {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Check file references
    this.validateFileReferences(content, lines, issues, warnings);
    
    // Check repository references
    this.validateRepositoryReferences(content, lines, issues);
    
    // Check formatting
    this.validateFormatting(content, lines, warnings);
    
    // Check required sections
    this.validateRequiredSections(content, issues, warnings);

    return {
      file: relative(this.rootDir, filePath),
      issues,
      warnings
    };
  }

  private validateFileReferences(content: string, lines: string[], issues: ValidationIssue[], warnings: ValidationIssue[]): void {
    // Check for file paths that should exist
    const fileRefRegex = /(?:path|file|located at|see|found in)[:\s]*([`'"]*)(\.?\.?\/[^`'"\s)]+)([`'"]*)/gi;
    let match;

    while ((match = fileRefRegex.exec(content)) !== null) {
      const filePath = match[2];
      const lineNum = content.substring(0, match.index).split('\n').length;
      
      // Skip certain patterns that aren't actual file references
      if (filePath.includes('example') || filePath.includes('template')) continue;
      
      const fullPath = join(this.rootDir, filePath);
      if (!existsSync(fullPath)) {
        issues.push({
          type: 'broken-file-reference',
          message: `File reference not found: ${filePath}`,
          line: lineNum,
          severity: 'error'
        });
      }
    }
  }

  private validateRepositoryReferences(content: string, lines: string[], issues: ValidationIssue[]): void {
    // Check for incorrect repository names
    const wrongRepoNames = ['arxiv-mcp-improved', 'arxiv-mcp-server', 'mcp-arxiv'];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const wrongName of wrongRepoNames) {
        if (line.includes(wrongName)) {
          issues.push({
            type: 'incorrect-repository-reference',
            message: `Incorrect repository name '${wrongName}' should be '${this.repoName}'`,
            line: i + 1,
            severity: 'error'
          });
        }
      }
    }
  }

  private validateFormatting(content: string, lines: string[], warnings: ValidationIssue[]): void {
    // Check for common typos
    const typos = [
      { wrong: 'tha ', correct: 'the ' },
      { wrong: 'explictly', correct: 'explicitly' },
      { wrong: 'VHECK', correct: 'CHECK' },
      { wrong: 'recieve', correct: 'receive' },
      { wrong: 'seperate', correct: 'separate' }
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const typo of typos) {
        if (line.includes(typo.wrong)) {
          warnings.push({
            type: 'typo',
            message: `Possible typo: '${typo.wrong}' should be '${typo.correct}'`,
            line: i + 1,
            severity: 'warning'
          });
        }
      }
    }

    // Check for inconsistent YAML frontmatter
    const hasYamlStart = content.startsWith('---');
    const hasHtmlComment = content.includes('<!-- ---');
    
    if (hasHtmlComment && hasYamlStart) {
      warnings.push({
        type: 'inconsistent-frontmatter',
        message: 'File has both YAML frontmatter and HTML comment frontmatter',
        severity: 'warning'
      });
    }
  }

  private validateRequiredSections(content: string, issues: ValidationIssue[], warnings: ValidationIssue[]): void {
    // Check for required sections in instruction files
    const requiredForAbsolute = ['[ABSOLUTE]', '[MANDATORY]'];
    const requiredForTesting = ['Testing', 'test'];
    
    if (content.includes('ABSOLUTE') || content.includes('absolute')) {
      for (const required of requiredForAbsolute) {
        if (!content.includes(required)) {
          warnings.push({
            type: 'missing-section',
            message: `Absolute rules file should contain '${required}' section`,
            severity: 'warning'
          });
        }
      }
    }

    if (content.toLowerCase().includes('testing')) {
      if (!content.includes('jest') && !content.includes('test pattern')) {
        warnings.push({
          type: 'missing-testing-detail',
          message: 'Testing instructions should include specific framework and pattern guidance',
          severity: 'warning'
        });
      }
    }
  }

  private checkForDuplicates(results: ValidationResult[]): void {
    const contentMap = new Map<string, string[]>();
    
    // Group files by content
    for (const result of results) {
      const content = readFileSync(result.file, 'utf-8');
      const normalizedContent = content.replace(/\s+/g, ' ').trim();
      
      if (!contentMap.has(normalizedContent)) {
        contentMap.set(normalizedContent, []);
      }
      contentMap.get(normalizedContent)!.push(result.file);
    }

    // Find duplicates
    for (const [content, files] of contentMap) {
      if (files.length > 1) {
        for (const file of files) {
          const result = results.find(r => r.file === file);
          if (result) {
            result.issues.push({
              type: 'duplicate-content',
              message: `Duplicate content found in: ${files.filter(f => f !== file).join(', ')}`,
              severity: 'error'
            });
          }
        }
      }
    }
  }

  public generateReport(results: ValidationResult[]): string {
    let report = '# Instruction Files Validation Report\n\n';
    
    const totalErrors = results.reduce((sum, r) => sum + r.issues.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    
    report += `## Summary\n`;
    report += `- Files checked: ${results.length}\n`;
    report += `- Total errors: ${totalErrors}\n`;
    report += `- Total warnings: ${totalWarnings}\n\n`;

    if (totalErrors === 0 && totalWarnings === 0) {
      report += '✅ All instruction files are valid!\n';
      return report;
    }

    for (const result of results) {
      if (result.issues.length === 0 && result.warnings.length === 0) continue;
      
      report += `## ${result.file}\n\n`;
      
      if (result.issues.length > 0) {
        report += `### ❌ Errors (${result.issues.length})\n\n`;
        for (const issue of result.issues) {
          const lineInfo = issue.line ? ` (line ${issue.line})` : '';
          report += `- **${issue.type}**${lineInfo}: ${issue.message}\n`;
        }
        report += '\n';
      }
      
      if (result.warnings.length > 0) {
        report += `### ⚠️ Warnings (${result.warnings.length})\n\n`;
        for (const warning of result.warnings) {
          const lineInfo = warning.line ? ` (line ${warning.line})` : '';
          report += `- **${warning.type}**${lineInfo}: ${warning.message}\n`;
        }
        report += '\n';
      }
    }

    return report;
  }
}

// Main execution
function main(): void {
  console.log('🔍 Validating instruction files...\n');
  
  const validator = new InstructionValidator();
  const results = validator.validateAll();
  const report = validator.generateReport(results);
  
  console.log(report);
  
  const hasErrors = results.some(r => r.issues.length > 0);
  process.exit(hasErrors ? 1 : 0);
}

// Check if this file is being run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}

export { InstructionValidator };