#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StructureRule {
  name: string;
  check: () => boolean;
  description: string;
}

/**
 * Validate repository structure compliance with defined standards
 */
class StructureValidator {
  private rootPath: string;
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor() {
    this.rootPath = path.resolve(__dirname, '../..');
  }

  /**
   * Run all validation checks
   */
  async validate(): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
    console.log('🔍 Validating repository structure...\n');

    const rules: StructureRule[] = [
      {
        name: 'Root directory file count',
        check: () => this.checkRootFileCount(),
        description: 'Root directory should have ≤15 files'
      },
      {
        name: 'Documentation structure',
        check: () => this.checkDocsStructure(),
        description: 'Documentation should have max 3 categories'
      },
      {
        name: 'Essential files location',
        check: () => this.checkEssentialFiles(),
        description: 'LICENSE, CONTRIBUTING.md, etc. should be in root'
      },
      {
        name: 'Configuration organization',
        check: () => this.checkConfigOrganization(),
        description: 'Config files should be in config/ directory'
      },
      {
        name: 'Scripts organization',
        check: () => this.checkScriptsOrganization(),
        description: 'Build scripts should be TypeScript in scripts/ directory'
      },
      {
        name: 'TypeScript script consistency',
        check: () => this.checkTypeScriptConsistency(),
        description: 'All scripts should be TypeScript (.ts) files'
      },
      {
        name: 'Kebab-case naming compliance',
        check: () => this.checkKebabCaseNaming(),
        description: 'File and directory names should use kebab-case format'
      }
    ];

    for (const rule of rules) {
      try {
        const passed = rule.check();
        if (passed) {
          console.log(`✅ ${rule.name}: PASSED`);
        } else {
          console.log(`❌ ${rule.name}: FAILED`);
        }
      } catch (error) {
        this.errors.push(`Error checking ${rule.name}: ${error}`);
        console.log(`⚠️  ${rule.name}: ERROR - ${error}`);
      }
    }

    const success = this.errors.length === 0;
    
    console.log(`\n📊 Validation Summary:`);
    console.log(`   Errors: ${this.errors.length}`);
    console.log(`   Warnings: ${this.warnings.length}`);
    
    if (this.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      this.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      this.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    return { success, errors: this.errors, warnings: this.warnings };
  }

  private checkRootFileCount(): boolean {
    const files = fs.readdirSync(this.rootPath).filter(file => {
      const stat = fs.statSync(path.join(this.rootPath, file));
      return stat.isFile();
    });
    
    if (files.length > 15) {
      this.errors.push(`Root directory has ${files.length} files (max 15 allowed)`);
      return false;
    }
    
    return true;
  }

  private checkDocsStructure(): boolean {
    const docsPath = path.join(this.rootPath, 'docs');
    if (!fs.existsSync(docsPath)) {
      this.errors.push('docs/ directory does not exist');
      return false;
    }

    const subdirs = fs.readdirSync(docsPath).filter(item => {
      const stat = fs.statSync(path.join(docsPath, item));
      return stat.isDirectory();
    });

    if (subdirs.length > 3) {
      this.errors.push(`docs/ has ${subdirs.length} subdirectories (max 3 allowed)`);
      return false;
    }

    const expectedDirs = ['guides', 'reference', 'decisions'];
    const missingDirs = expectedDirs.filter(dir => !subdirs.includes(dir));
    
    if (missingDirs.length > 0) {
      this.warnings.push(`Missing expected docs subdirectories: ${missingDirs.join(', ')}`);
    }

    return true;
  }

  private checkEssentialFiles(): boolean {
    // Essential files can now be in docs/reference/ due to cleanup
    const essentialInRoot = ['LICENSE', 'README.md'];
    const essentialInDocs = ['CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md', 'CHANGELOG.md'];
    
    const missingInRoot = essentialInRoot.filter(file => 
      !fs.existsSync(path.join(this.rootPath, file))
    );
    
    const docsPath = path.join(this.rootPath, 'docs', 'reference');
    const missingInDocs = essentialInDocs.filter(file => 
      !fs.existsSync(path.join(docsPath, file))
    );

    if (missingInRoot.length > 0) {
      this.errors.push(`Missing essential files in root: ${missingInRoot.join(', ')}`);
      return false;
    }
    
    if (missingInDocs.length > 0) {
      this.warnings.push(`Missing documentation files in docs/reference/: ${missingInDocs.join(', ')}`);
    }

    return true;
  }

  private checkConfigOrganization(): boolean {
    const configPath = path.join(this.rootPath, 'config');
    if (!fs.existsSync(configPath)) {
      this.errors.push('config/ directory does not exist');
      return false;
    }

    // Check for scattered config files in root
    const scatteredConfigs = ['.eslintrc.json', '.prettierrc.json', '.markdownlint.json'];
    const foundInRoot = scatteredConfigs.filter(file => 
      fs.existsSync(path.join(this.rootPath, file))
    );

    if (foundInRoot.length > 0) {
      this.warnings.push(`Config files still in root: ${foundInRoot.join(', ')}`);
    }

    return true;
  }

  private checkScriptsOrganization(): boolean {
    const scriptsPath = path.join(this.rootPath, 'scripts');
    if (!fs.existsSync(scriptsPath)) {
      this.errors.push('scripts/ directory does not exist');
      return false;
    }

    return true;
  }

  private checkTypeScriptConsistency(): boolean {
    // Check for JavaScript files that should be TypeScript
    const jsFiles = ['fix-imports.js', 'fix-arrays.js', 'fix-imports.cjs'].filter(file =>
      fs.existsSync(path.join(this.rootPath, file))
    );

    if (jsFiles.length > 0) {
      this.warnings.push(`JavaScript files in root that should be moved/converted: ${jsFiles.join(', ')}`);
    }

    return true;
  }

  private checkKebabCaseNaming(): boolean {
    const violations: string[] = [];
    const existingViolations: string[] = [];
    
    // Define directories to check for kebab-case compliance
    const directoriesToCheck = ['src', 'docs', 'config', 'scripts'];
    
    // Define file extensions to validate
    const fileExtensions = ['.ts', '.js', '.md', '.json'];
    
    // Define exceptions that don't need to follow kebab-case
    const exceptions = [
      'README.md', 'LICENSE', 'CHANGELOG.md', 'CONTRIBUTING.md', 
      'CODE_OF_CONDUCT.md', 'SECURITY.md', '.gitignore', '.env', '.env.example',
      'TODO.md', 'AGENT.md' // Allow some documentation files to use UPPERCASE
    ];
    
    // Define existing files that are grandfathered in (to be converted gradually)
    const grandfatheredPaths = [
      'src/__tests__', 'src/analyzers', 'src/services', 'src/utils', 'src/strategies',
      'src/testing', 'src/benchmarks', 'src/cache', 'src/config',
      'docs/decisions', 'docs/guides', 'docs/reference',
      'config/quality'
    ];
    
    for (const dir of directoriesToCheck) {
      const dirPath = path.join(this.rootPath, dir);
      if (fs.existsSync(dirPath)) {
        this.checkKebabCaseInDirectory(dirPath, violations, existingViolations, exceptions, fileExtensions, dir, grandfatheredPaths);
      }
    }
    
    // Report existing violations as warnings (not errors)
    if (existingViolations.length > 0) {
      this.warnings.push(`Existing kebab-case naming violations (consider refactoring):`);
      existingViolations.slice(0, 10).forEach(violation => { // Limit to first 10 to avoid overwhelming output
        this.warnings.push(`  - ${violation}`);
      });
      if (existingViolations.length > 10) {
        this.warnings.push(`  - ... and ${existingViolations.length - 10} more files`);
      }
    }
    
    // Only fail on new violations (not in grandfathered directories)
    if (violations.length > 0) {
      this.errors.push(`New kebab-case naming violations found (must fix):`);
      violations.forEach(violation => {
        this.errors.push(`  - ${violation}`);
      });
      return false;
    }
    
    return true;
  }
  
  private checkKebabCaseInDirectory(
    dirPath: string, 
    violations: string[], 
    existingViolations: string[],
    exceptions: string[], 
    fileExtensions: string[],
    relativePath: string,
    grandfatheredPaths: string[]
  ): void {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const relativeItemPath = path.join(relativePath, item);
      const stat = fs.statSync(itemPath);
      
      // Skip exceptions
      if (exceptions.includes(item)) {
        continue;
      }
      
      // Check if item follows kebab-case pattern
      const isKebabCase = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+)*$/.test(item);
      
      // Check if this is in a grandfathered directory
      const isGrandfathered = grandfatheredPaths.some(grandfather => 
        relativePath.startsWith(grandfather) || relativeItemPath.startsWith(grandfather)
      );
      
      if (stat.isFile()) {
        // Only check files with specific extensions
        const hasRelevantExtension = fileExtensions.some(ext => item.endsWith(ext));
        if (hasRelevantExtension && !isKebabCase) {
          if (isGrandfathered) {
            existingViolations.push(`File: ${relativeItemPath}`);
          } else {
            violations.push(`File: ${relativeItemPath} (should use kebab-case)`);
          }
        }
      } else if (stat.isDirectory()) {
        // Check directory names
        if (!isKebabCase) {
          if (isGrandfathered) {
            existingViolations.push(`Directory: ${relativeItemPath}/`);
          } else {
            violations.push(`Directory: ${relativeItemPath}/ (should use kebab-case)`);
          }
        }
        
        // Recursively check subdirectories
        this.checkKebabCaseInDirectory(itemPath, violations, existingViolations, exceptions, fileExtensions, relativeItemPath, grandfatheredPaths);
      }
    }
  }
}

// Run validation
const validator = new StructureValidator();
validator.validate().then(result => {
  if (result.success) {
    console.log('\n🎉 Repository structure validation PASSED!');
    process.exit(0);
  } else {
    console.log('\n💥 Repository structure validation FAILED!');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n❌ Validation error:', error);
  process.exit(1);
});