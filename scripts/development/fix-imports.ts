#!/usr/bin/env tsx

/**
 * TypeScript Import Path Fixer
 * 
 * This script fixes import paths throughout the codebase to maintain consistency
 * with kebab-case naming conventions and relocated files.
 * 
 * Should be run after:
 * - File renaming operations
 * - Directory restructuring
 * - Build process to ensure import consistency
 */

import { promises as fs } from 'fs';
import path from 'path';

// Mapping of old file names to new kebab-case names
const IMPORT_MAPPINGS: Record<string, string> = {
  'CodeReader': 'code-reader',
  'EnvironmentValidator': 'environment-validator',
  'ErrorBoundary': 'error-boundary',
  'ErrorClassifier': 'error-classifier',
  'EventBus': 'event-bus',
  'FileSystemAbstraction': 'file-system-abstraction',
  'HealthChecker': 'health-checker',
  'InputValidator': 'input-validator',
  'JsDocGenerator': 'js-doc-generator',
  'Logger': 'logger',
  'MemoryManagementProtocol': 'memory-management-protocol',
  'MemoryManagementProtocolExample': 'memory-management-protocol-example',
  'MemoryManager': 'memory-manager',
  'MemoryOptimizer': 'memory-optimizer',
  'NamingConventions': 'naming-conventions',
  'PerformanceMonitor': 'performance-monitor',
  'PromptSanitizer': 'prompt-sanitizer',
  'ResponseFormatter': 'response-formatter',
  'SecureCodeReader': 'secure-code-reader',
  'ServiceContainer': 'service-container',
  'ServiceFactory': 'service-factory',
  'SimpleServiceManager': 'simple-service-manager',
  'StructuredLogger': 'structured-logger',
  'TypeAdapters': 'type-adapters',
  'ApiManager': 'api-manager',
  'ConversationalGeminiService': 'conversational-gemini-service',
  'ConversationManager': 'conversation-manager',
  'GeminiService': 'gemini-service',
  'HypothesisTournamentService': 'hypothesis-tournament-service',
  'OpenAIService': 'openai-service',
  'IntegrationTestFramework': 'integration-test-framework',
  'TestSuiteRunner': 'test-suite-runner',
  'PerformanceBenchmark': 'performance-benchmark',
  'QualityAssurance': 'quality-assurance',
  'AnalysisCache': 'analysis-cache',
  'SimpleCache': 'simple-cache',
  'ReasoningStrategy': 'reasoning-strategy',
  'StrategyManager': 'strategy-manager',
  'HypothesisTester': 'hypothesis-tester'
};

// Known typos and correction mappings
const TYPO_CORRECTIONS: Record<string, string> = {
  'Structuredlogger': 'structured-logger'
};

/**
 * Recursively find all TypeScript files in a directory
 */
async function getAllTsFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function scan(currentDir: string) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Could not scan directory ${currentDir}:`, error);
    }
  }
  
  await scan(dir);
  return files;
}

/**
 * Fix import statements in a single file
 */
async function fixImportsInFile(filePath: string): Promise<boolean> {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    let hasChanges = false;
    
    // Fix PascalCase imports to kebab-case
    for (const [oldName, newName] of Object.entries(IMPORT_MAPPINGS)) {
      // Match @utils/OldName.js patterns
      const utilsPattern = new RegExp(`@utils\\/${oldName}\\.js`, 'g');
      if (utilsPattern.test(content)) {
        content = content.replace(utilsPattern, `@utils/${newName}.js`);
        hasChanges = true;
      }
      
      // Match @utils/OldName patterns (without .js)
      const utilsPatternNoExt = new RegExp(`@utils\\/${oldName}(?![\\w\\.])`, 'g');
      if (utilsPatternNoExt.test(content)) {
        content = content.replace(utilsPatternNoExt, `@utils/${newName}`);
        hasChanges = true;
      }
      
      // Match relative paths ../utils/OldName.js
      const relativePattern = new RegExp(`(\\.\\./[^'"]*)${oldName}\\.js`, 'g');
      if (relativePattern.test(content)) {
        content = content.replace(relativePattern, `$1${newName}.js`);
        hasChanges = true;
      }
      
      // Match relative paths ../utils/OldName
      const relativePatternNoExt = new RegExp(`(\\.\\./[^'"]*)${oldName}(?![\\w\\.])`, 'g');
      if (relativePatternNoExt.test(content)) {
        content = content.replace(relativePatternNoExt, `$1${newName}`);
        hasChanges = true;
      }
    }
    
    // Fix known typos
    for (const [typo, correction] of Object.entries(TYPO_CORRECTIONS)) {
      const typoPattern = new RegExp(typo, 'g');
      if (typoPattern.test(content)) {
        content = content.replace(typoPattern, correction);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      await fs.writeFile(filePath, content, 'utf-8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

/**
 * Main function to fix all imports
 */
async function main(): Promise<void> {
  console.log('🔧 Fixing TypeScript import statements...');
  
  const rootDir = path.join(process.cwd(), 'src');
  const files = await getAllTsFiles(rootDir);
  
  let fixedCount = 0;
  
  for (const filePath of files) {
    const wasFixed = await fixImportsInFile(filePath);
    if (wasFixed) {
      console.log(`✅ Fixed imports in: ${path.relative(process.cwd(), filePath)}`);
      fixedCount++;
    }
  }
  
  if (fixedCount === 0) {
    console.log('✨ All import statements are already correct!');
  } else {
    console.log(`🎉 Fixed imports in ${fixedCount} files`);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as fixImports };