#!/usr/bin/env node

/**
 * JSDoc Documentation Analysis CLI Tool
 *
 * Command-line tool for analyzing and reporting JSDoc documentation coverage
 * across TypeScript projects. Provides detailed analysis, validation, and
 * improvement suggestions for comprehensive code documentation.
 *
 * @author Deep Code Reasoning MCP Team
 * @version 1.0.0
 * @since 2024
 */

import * as path from 'path';
import { JSDocGenerator, JSDocReport } from '../utils/js-doc-generator.js';

interface CliOptions {
  /** Project directory to analyze */
  projectPath: string;
  /** Include test files in analysis */
  includeTests: boolean;
  /** Include private methods and properties */
  includePrivate: boolean;
  /** Enable strict validation mode */
  strictMode: boolean;
  /** Output format: console, json, or markdown */
  format: 'console' | 'json' | 'markdown';
  /** Output file path (optional) */
  output?: string;
  /** Enable verbose output */
  verbose: boolean;
  /** Show help information */
  help: boolean;
  /** Minimum coverage threshold for exit code */
  threshold?: number;
  /** Focus on specific file patterns */
  include?: string[];
  /** Exclude specific file patterns */
  exclude?: string[];
}

/**
 * JSDoc Documentation CLI Tool
 *
 * Provides comprehensive analysis and reporting of JSDoc documentation
 * coverage across TypeScript projects with detailed validation results.
 */
class JSDocCLI {
  private static readonly DEFAULT_OPTIONS: Partial<CliOptions> = {
    includeTests: false,
    includePrivate: false,
    strictMode: false,
    format: 'console',
    verbose: false,
    help: false,
  };

  /**
   * Main entry point for the CLI tool
   *
   * @param args - Command line arguments
   * @returns Promise resolving to exit code
   *
   * @example
   * ```bash
   * node jsdoc-cli.js ./src --format=json --output=jsdoc-report.json
   * ```
   *
   * @since 1.0.0
   */
  static async main(args: string[]): Promise<number> {
    try {
      const options = this.parseArguments(args);

      if (options.help) {
        this.printHelp();
        return 0;
      }

      if (!options.projectPath) {
        console.error('Error: Project path is required');
        this.printUsage();
        return 1;
      }

      console.log('🔍 Analyzing JSDoc documentation...\n');

      const report = await JSDocGenerator.generateProjectReport(options.projectPath, {
        includeTests: options.includeTests,
        includePrivate: options.includePrivate,
        strictMode: options.strictMode,
        outputFormat: options.format,
        outputPath: options.output,
      });

      await this.displayReport(report, options);

      // Check threshold if specified
      if (options.threshold !== undefined) {
        if (report.coverage < options.threshold) {
          console.error(`\n❌ Documentation coverage ${report.coverage}% is below threshold ${options.threshold}%`);
          return 1;
        } else {
          console.log(`\n✅ Documentation coverage ${report.coverage}% meets threshold ${options.threshold}%`);
        }
      }

      return 0;
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      return 1;
    }
  }

  /**
   * Parses command line arguments into options object
   *
   * @param args - Raw command line arguments
   * @returns Parsed options object
   *
   * @example
   * ```typescript
   * const options = JSDocCLI.parseArguments(['./src', '--verbose', '--format=json']);
   * ```
   *
   * @since 1.0.0
   */
  private static parseArguments(args: string[]): CliOptions {
    const options: CliOptions = {
      ...this.DEFAULT_OPTIONS,
      projectPath: '',
      includeTests: false,
      includePrivate: false,
      strictMode: false,
      format: 'console',
      verbose: false,
      help: false,
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--help' || arg === '-h') {
        options.help = true;
      } else if (arg === '--include-tests') {
        options.includeTests = true;
      } else if (arg === '--include-private') {
        options.includePrivate = true;
      } else if (arg === '--strict') {
        options.strictMode = true;
      } else if (arg === '--verbose' || arg === '-v') {
        options.verbose = true;
      } else if (arg.startsWith('--format=')) {
        const format = arg.split('=')[1] as 'console' | 'json' | 'markdown';
        if (['console', 'json', 'markdown'].includes(format)) {
          options.format = format;
        } else {
          throw new Error(`Invalid format: ${format}. Must be console, json, or markdown`);
        }
      } else if (arg.startsWith('--output=')) {
        options.output = arg.split('=')[1];
      } else if (arg.startsWith('--threshold=')) {
        const threshold = parseInt(arg.split('=')[1]);
        if (isNaN(threshold) || threshold < 0 || threshold > 100) {
          throw new Error(`Invalid threshold: ${arg.split('=')[1]}. Must be a number between 0 and 100`);
        }
        options.threshold = threshold;
      } else if (arg.startsWith('--include=')) {
        options.include = arg.split('=')[1].split(',');
      } else if (arg.startsWith('--exclude=')) {
        options.exclude = arg.split('=')[1].split(',');
      } else if (!arg.startsWith('-') && !options.projectPath) {
        options.projectPath = path.resolve(arg);
      } else if (arg.startsWith('-')) {
        throw new Error(`Unknown option: ${arg}`);
      }
    }

    return options;
  }

  /**
   * Displays JSDoc analysis report in the specified format
   *
   * @param report - JSDoc analysis report
   * @param options - CLI options for output formatting
   * @returns Promise resolving when display is complete
   *
   * @since 1.0.0
   */
  private static async displayReport(report: JSDocReport, options: CliOptions): Promise<void> {
    switch (options.format) {
      case 'json':
        if (options.output) {
          console.log(`📄 Report written to: ${options.output}`);
        } else {
          console.log(JSON.stringify(report, null, 2));
        }
        break;

      case 'markdown':
        if (options.output) {
          console.log(`📄 Markdown report written to: ${options.output}`);
        } else {
          console.log(this.generateMarkdownReport(report));
        }
        break;

      default: // console
        this.displayConsoleReport(report, options.verbose);
        break;
    }
  }

  /**
   * Displays JSDoc report in console format
   *
   * @param report - JSDoc analysis report
   * @param verbose - Whether to show detailed information
   *
   * @since 1.0.0
   */
  private static displayConsoleReport(report: JSDocReport, verbose: boolean): void {
    // Header
    console.log('📚 JSDoc Documentation Analysis Report');
    console.log('=====================================\n');

    // Coverage summary
    const coverageEmoji = report.coverage >= 90 ? '🟢' : report.coverage >= 70 ? '🟡' : '🔴';
    console.log(`${coverageEmoji} Overall Coverage: ${report.coverage}%`);
    console.log(`📊 Total Elements: ${report.totalElements}`);
    console.log(`✅ Documented: ${report.documentedElements}`);
    console.log(`❌ Missing Documentation: ${report.undocumentedElements}\n`);

    // Statistics by element type
    console.log('📋 Documentation by Element Type:');
    console.log('─'.repeat(40));
    Object.entries(report.statistics.byElementType).forEach(([type, stats]) => {
      const typedStats = stats as { total: number; documented: number; coverage: number };
      const percentage = typedStats.coverage;
      const emoji = percentage >= 90 ? '🟢' : percentage >= 70 ? '🟡' : '🔴';
      console.log(`${emoji} ${type.padEnd(12)}: ${percentage}% (${typedStats.documented}/${typedStats.total})`);
    });
    console.log('');

    // File coverage (top/bottom performers)
    if (verbose) {
      console.log('📁 Documentation by File:');
      console.log('─'.repeat(40));

      const fileStats = Object.entries(report.statistics.byFile)
        .map(([file, stats]) => {
          const typedStats = stats as { total: number; documented: number; coverage: number };
          return { file: path.basename(file), ...typedStats };
        })
        .sort((a, b) => a.coverage - b.coverage);

      // Show bottom 5 files (most needing attention)
      console.log('\n🚨 Files needing most attention:');
      fileStats.slice(0, 5).forEach(stats => {
        const emoji = stats.coverage >= 70 ? '🟡' : '🔴';
        console.log(`${emoji} ${stats.file.padEnd(25)}: ${stats.coverage}% (${stats.documented}/${stats.total})`);
      });

      // Show top 5 files (best documented)
      if (fileStats.length > 5) {
        console.log('\n⭐ Best documented files:');
        fileStats.slice(-5).reverse().forEach(stats => {
          const emoji = stats.coverage >= 90 ? '🟢' : '🟡';
          console.log(`${emoji} ${stats.file.padEnd(25)}: ${stats.coverage}% (${stats.documented}/${stats.total})`);
        });
      }
      console.log('');
    }

    // Recommendations
    console.log('💡 Recommendations:');
    console.log('─'.repeat(30));
    report.recommendations.forEach((rec: string, index: number) => {
      console.log(`${index + 1}. ${rec}`);
    });
    console.log('');

    // Issues summary (if verbose)
    if (verbose && report.undocumentedElements > 0) {
      console.log('🔍 Issue Details:');
      console.log('─'.repeat(25));

      const issuesByFile = Object.entries(report.fileResults)
        .map(([file, results]) => {
          const typedResults = results as Array<{ isValid: boolean }>;
          return {
            file: path.basename(file),
            issues: typedResults.filter((r: { isValid: boolean }) => !r.isValid).length,
          };
        })
        .filter(item => item.issues > 0)
        .sort((a, b) => b.issues - a.issues)
        .slice(0, 10);

      issuesByFile.forEach(item => {
        console.log(`📄 ${item.file}: ${item.issues} issues`);
      });
      console.log('');
    }

    // Footer
    console.log(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);

    if (report.coverage >= 90) {
      console.log('\n🎉 Excellent documentation coverage! Keep up the great work!');
    } else if (report.coverage >= 70) {
      console.log('\n👍 Good documentation coverage. Consider addressing the remaining gaps.');
    } else {
      console.log('\n⚠️  Documentation coverage needs improvement. Focus on public APIs first.');
    }
  }

  /**
   * Generates markdown format report
   *
   * @param report - JSDoc analysis report
   * @returns Markdown formatted report string
   *
   * @since 1.0.0
   */
  private static generateMarkdownReport(report: JSDocReport): string {
    const lines: string[] = [];

    lines.push('# 📚 JSDoc Documentation Analysis Report');
    lines.push('');
    lines.push(`**Generated:** ${new Date(report.generatedAt).toLocaleString()}`);
    lines.push('');

    // Coverage summary
    const coverageEmoji = report.coverage >= 90 ? '🟢' : report.coverage >= 70 ? '🟡' : '🔴';
    lines.push('## Coverage Summary');
    lines.push('');
    lines.push(`${coverageEmoji} **Overall Coverage:** ${report.coverage}%`);
    lines.push(`📊 **Total Elements:** ${report.totalElements}`);
    lines.push(`✅ **Documented:** ${report.documentedElements}`);
    lines.push(`❌ **Missing Documentation:** ${report.undocumentedElements}`);
    lines.push('');

    // Statistics by element type
    lines.push('## Documentation by Element Type');
    lines.push('');
    lines.push('| Element Type | Coverage | Documented | Total |');
    lines.push('|--------------|----------|------------|--------|');
    Object.entries(report.statistics.byElementType).forEach(([type, stats]) => {
      const typedStats = stats as { total: number; documented: number; coverage: number };
      const emoji = typedStats.coverage >= 90 ? '🟢' : typedStats.coverage >= 70 ? '🟡' : '🔴';
      lines.push(`| ${emoji} ${type} | ${typedStats.coverage}% | ${typedStats.documented} | ${typedStats.total} |`);
    });
    lines.push('');

    // File coverage
    lines.push('## Documentation by File');
    lines.push('');
    const fileStats = Object.entries(report.statistics.byFile)
      .map(([file, stats]) => {
        const typedStats = stats as { total: number; documented: number; coverage: number };
        return { file: path.basename(file), fullPath: file, ...typedStats };
      })
      .sort((a, b) => a.coverage - b.coverage);

    lines.push('| File | Coverage | Documented | Total |');
    lines.push('|------|----------|------------|--------|');
    fileStats.forEach(stats => {
      const emoji = stats.coverage >= 90 ? '🟢' : stats.coverage >= 70 ? '🟡' : '🔴';
      lines.push(`| ${emoji} ${stats.file} | ${stats.coverage}% | ${stats.documented} | ${stats.total} |`);
    });
    lines.push('');

    // Recommendations
    lines.push('## 💡 Recommendations');
    lines.push('');
    report.recommendations.forEach((rec: string, index: number) => {
      lines.push(`${index + 1}. ${rec}`);
    });
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Prints help information
   *
   * @since 1.0.0
   */
  private static printHelp(): void {
    console.log('📚 JSDoc Documentation Analysis CLI Tool');
    console.log('=======================================\n');
    console.log('Analyze and report JSDoc documentation coverage across TypeScript projects.\n');

    this.printUsage();

    console.log('Options:');
    console.log('  --help, -h              Show this help message');
    console.log('  --include-tests         Include test files in analysis');
    console.log('  --include-private       Include private methods and properties');
    console.log('  --strict                Enable strict validation mode');
    console.log('  --verbose, -v           Show detailed output');
    console.log('  --format=FORMAT         Output format: console, json, markdown (default: console)');
    console.log('  --output=FILE           Write report to file');
    console.log('  --threshold=NUMBER      Minimum coverage percentage for success (0-100)');
    console.log('  --include=PATTERNS      Comma-separated file patterns to include');
    console.log('  --exclude=PATTERNS      Comma-separated file patterns to exclude');
    console.log('');
    console.log('Examples:');
    console.log('  jsdoc-cli ./src                                    # Analyze src directory');
    console.log('  jsdoc-cli ./src --verbose --include-tests          # Include test files');
    console.log('  jsdoc-cli ./src --format=json --output=report.json # Generate JSON report');
    console.log('  jsdoc-cli ./src --threshold=80                     # Require 80% coverage');
    console.log('  jsdoc-cli ./src --format=markdown > README.md      # Generate markdown');
    console.log('');
  }

  /**
   * Prints usage information
   *
   * @since 1.0.0
   */
  private static printUsage(): void {
    console.log('Usage: jsdoc-cli <project-path> [options]\n');
  }
}

// Run CLI if this file is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this file is being run directly
const isMainModule = process.argv[1] === __filename || process.argv[1] === __filename.replace(/\.js$/, '.ts');

if (isMainModule) {
  JSDocCLI.main(process.argv.slice(2)).then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { JSDocCLI };
