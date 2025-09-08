#!/usr/bin/env node
/**
 * Naming Conventions CLI Tool
 * 
 * Scans the project for naming convention violations and provides
 * detailed reports and suggestions for improvement.
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { NamingConventions, type IProjectNamingReport } from '../utils/NamingConventions.js';

interface ICLIOptions {
  projectPath: string;
  outputFormat: 'console' | 'json' | 'markdown';
  fix: boolean;
  verbose: boolean;
  ignorePatterns: string[];
  configFile?: string;
}

class NamingConventionsCLI {
  private options: ICLIOptions;

  constructor(options: ICLIOptions) {
    this.options = options;
  }

  /**
   * Main CLI entry point
   */
  async run(): Promise<void> {
    console.log('🔍 Scanning project for naming convention violations...\n');

    try {
      // Collect all TypeScript files
      const files = await this.collectTypeScriptFiles(this.options.projectPath);
      console.log(`📁 Found ${files.size} TypeScript files to analyze\n`);

      // Generate naming report
      const report = NamingConventions.generateProjectReport(files);

      // Display results
      await this.displayReport(report);

      // Exit with appropriate code
      const exitCode = report.summary.totalViolations > 0 ? 1 : 0;
      process.exit(exitCode);
    } catch (error) {
      console.error('❌ Error running naming conventions check:', error);
      process.exit(1);
    }
  }

  /**
   * Recursively collect all TypeScript files in the project
   */
  private async collectTypeScriptFiles(dirPath: string): Promise<Map<string, string>> {
    const files = new Map<string, string>();
    
    await this.scanDirectory(dirPath, files);
    return files;
  }

  /**
   * Recursively scan a directory for TypeScript files
   */
  private async scanDirectory(dirPath: string, files: Map<string, string>): Promise<void> {
    try {
      const entries = await readdir(dirPath);

      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stats = await stat(fullPath);

        // Skip ignored directories and files
        if (this.shouldIgnore(fullPath)) {
          continue;
        }

        if (stats.isDirectory()) {
          await this.scanDirectory(fullPath, files);
        } else if (stats.isFile() && entry.endsWith('.ts')) {
          try {
            const content = await readFile(fullPath, 'utf-8');
            const relativePath = relative(this.options.projectPath, fullPath);
            files.set(relativePath, content);
          } catch (error) {
            if (this.options.verbose) {
              console.warn(`⚠️  Skipped file ${fullPath}: ${error}`);
            }
          }
        }
      }
    } catch (error) {
      if (this.options.verbose) {
        console.warn(`⚠️  Skipped directory ${dirPath}: ${error}`);
      }
    }
  }

  /**
   * Check if a path should be ignored
   */
  private shouldIgnore(path: string): boolean {
    const defaultIgnorePatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.nyc_output',
      'lib',
      '*.d.ts',
    ];

    const allPatterns = [...defaultIgnorePatterns, ...this.options.ignorePatterns];
    
    return allPatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(path);
      }
      return path.includes(pattern);
    });
  }

  /**
   * Display the naming conventions report
   */
  private async displayReport(report: IProjectNamingReport): Promise<void> {
    switch (this.options.outputFormat) {
      case 'json':
        this.displayJsonReport(report);
        break;
      case 'markdown':
        this.displayMarkdownReport(report);
        break;
      default:
        this.displayConsoleReport(report);
        break;
    }
  }

  /**
   * Display report in console format
   */
  private displayConsoleReport(report: IProjectNamingReport): void {
    // Summary
    console.log('📊 Naming Conventions Report Summary');
    console.log('═'.repeat(50));
    console.log(`Files Checked: ${report.summary.filesChecked}`);
    console.log(`Total Elements: ${report.summary.totalElements}`);
    console.log(`Violations Found: ${report.summary.totalViolations}`);
    console.log(`Compliance: ${report.summary.compliancePercentage}%`);
    
    const status = report.summary.compliancePercentage >= 95 ? '✅ Excellent' :
                   report.summary.compliancePercentage >= 80 ? '⚠️  Good' :
                   report.summary.compliancePercentage >= 60 ? '🔶 Needs Work' : '❌ Poor';
    console.log(`Status: ${status}`);
    console.log('');

    if (report.summary.totalViolations === 0) {
      console.log('🎉 Congratulations! No naming convention violations found.');
      return;
    }

    // Detailed violations
    console.log('🔍 Detailed Violations');
    console.log('═'.repeat(50));

    let violationCount = 0;
    for (const fileResult of report.fileResults) {
      if (fileResult.violations.length === 0) continue;

      console.log(`\n📄 ${fileResult.filePath}`);
      console.log(`   Compliance: ${fileResult.summary.compliancePercentage}%`);
      
      for (const violation of fileResult.violations) {
        violationCount++;
        console.log(`   ${violationCount}. Line ${violation.line}: ${violation.type} "${violation.name}"`);
        console.log(`      Expected: ${violation.expected}`);
        console.log(`      Pattern: ${violation.pattern}`);
        
        if (!this.options.verbose && violationCount >= 20) {
          const remaining = report.summary.totalViolations - violationCount;
          if (remaining > 0) {
            console.log(`\n   ... and ${remaining} more violations`);
            console.log('   Use --verbose flag to see all violations');
          }
          break;
        }
      }
      
      if (!this.options.verbose && violationCount >= 20) break;
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations');
      console.log('═'.repeat(50));
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    // Quick fix summary
    console.log('\n🔧 Quick Fixes');
    console.log('═'.repeat(50));
    console.log('To automatically fix some violations, run:');
    console.log(`  npx naming-conventions --fix`);
    console.log('\nTo see detailed patterns and examples:');
    console.log('  npx naming-conventions --help-patterns');
  }

  /**
   * Display report in JSON format
   */
  private displayJsonReport(report: IProjectNamingReport): void {
    console.log(JSON.stringify(report, null, 2));
  }

  /**
   * Display report in Markdown format
   */
  private displayMarkdownReport(report: IProjectNamingReport): void {
    console.log('# Naming Conventions Report\n');
    
    console.log('## Summary\n');
    console.log(`- **Files Checked:** ${report.summary.filesChecked}`);
    console.log(`- **Total Elements:** ${report.summary.totalElements}`);
    console.log(`- **Violations Found:** ${report.summary.totalViolations}`);
    console.log(`- **Compliance:** ${report.summary.compliancePercentage}%\n`);

    if (report.summary.totalViolations === 0) {
      console.log('✅ **No violations found!** Great job maintaining consistent naming conventions.\n');
      return;
    }

    console.log('## Violations by File\n');
    
    for (const fileResult of report.fileResults) {
      if (fileResult.violations.length === 0) continue;

      console.log(`### \`${fileResult.filePath}\`\n`);
      console.log(`**Compliance:** ${fileResult.summary.compliancePercentage}%\n`);
      
      console.log('| Line | Type | Name | Expected | Pattern |');
      console.log('|------|------|------|----------|---------|');
      
      for (const violation of fileResult.violations) {
        console.log(`| ${violation.line} | ${violation.type} | \`${violation.name}\` | \`${violation.expected}\` | \`${violation.pattern}\` |`);
      }
      
      console.log('');
    }

    if (report.recommendations.length > 0) {
      console.log('## Recommendations\n');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      console.log('');
    }
  }

  /**
   * Display help for naming patterns
   */
  static displayPatternHelp(): void {
    console.log('📚 Naming Convention Patterns\n');
    console.log('═'.repeat(50));
    
    const examples = [
      {
        category: 'Variables & Functions',
        pattern: 'camelCase',
        examples: ['userName', 'getCurrentUser', 'apiKey', 'isValid'],
        description: 'Start with lowercase, capitalize subsequent words'
      },
      {
        category: 'Classes & Types',
        pattern: 'PascalCase',
        examples: ['GeminiService', 'UserManager', 'ApiResponse', 'EventType'],
        description: 'Start with uppercase, capitalize subsequent words'
      },
      {
        category: 'Interfaces',
        pattern: 'IPascalCase',
        examples: ['IUserService', 'IApiResponse', 'IConfigOptions'],
        description: 'PascalCase with "I" prefix'
      },
      {
        category: 'Constants',
        pattern: 'SCREAMING_SNAKE_CASE',
        examples: ['API_KEY', 'MAX_RETRIES', 'DEFAULT_TIMEOUT'],
        description: 'All uppercase with underscores'
      },
      {
        category: 'API Parameters (MCP)',
        pattern: 'snake_case',
        examples: ['claude_context', 'session_id', 'analysis_type'],
        description: 'All lowercase with underscores'
      },
      {
        category: 'Event Types',
        pattern: 'kebab-case',
        examples: ['user-login', 'analysis-complete', 'error-occurred'],
        description: 'All lowercase with hyphens'
      },
    ];

    for (const example of examples) {
      console.log(`\n${example.category}:`);
      console.log(`  Pattern: ${example.pattern}`);
      console.log(`  Description: ${example.description}`);
      console.log(`  Examples: ${example.examples.join(', ')}`);
    }

    console.log('\n🔧 Usage Examples:');
    console.log('  Check current directory: npx naming-conventions');
    console.log('  Check specific directory: npx naming-conventions --path ./src');
    console.log('  Output as JSON: npx naming-conventions --format json');
    console.log('  Verbose output: npx naming-conventions --verbose');
  }
}

/**
 * Parse command line arguments
 */
function parseArguments(): ICLIOptions {
  const args = process.argv.slice(2);
  const options: ICLIOptions = {
    projectPath: process.cwd(),
    outputFormat: 'console',
    fix: false,
    verbose: false,
    ignorePatterns: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--path':
      case '-p':
        options.projectPath = args[++i] || process.cwd();
        break;
      case '--format':
      case '-f':
        const format = args[++i];
        if (['console', 'json', 'markdown'].includes(format)) {
          options.outputFormat = format as 'console' | 'json' | 'markdown';
        }
        break;
      case '--fix':
        options.fix = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--ignore':
        options.ignorePatterns.push(args[++i]);
        break;
      case '--help':
      case '-h':
        displayHelp();
        process.exit(0);
      case '--help-patterns':
        NamingConventionsCLI.displayPatternHelp();
        process.exit(0);
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          displayHelp();
          process.exit(1);
        }
        break;
    }
  }

  return options;
}

/**
 * Display CLI help
 */
function displayHelp(): void {
  console.log('📏 Naming Conventions CLI Tool\n');
  console.log('Usage: npx naming-conventions [options]\n');
  console.log('Options:');
  console.log('  --path, -p <path>     Project path to scan (default: current directory)');
  console.log('  --format, -f <format> Output format: console, json, markdown (default: console)');
  console.log('  --fix                 Automatically fix violations (experimental)');
  console.log('  --verbose, -v         Show detailed output including all violations');
  console.log('  --ignore <pattern>    Ignore files/directories matching pattern');
  console.log('  --help, -h            Show this help message');
  console.log('  --help-patterns       Show detailed naming pattern examples');
  console.log('\nExamples:');
  console.log('  npx naming-conventions');
  console.log('  npx naming-conventions --path ./src --format json');
  console.log('  npx naming-conventions --verbose --ignore "*.generated.ts"');
}

// Main execution
async function main() {
  const options = parseArguments();
  const cli = new NamingConventionsCLI(options);
  try {
    await cli.run();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Check if this module is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { NamingConventionsCLI, type ICLIOptions };
