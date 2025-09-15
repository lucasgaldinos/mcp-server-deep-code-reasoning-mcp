#!/usr/bin/env tsx

/**
 * Workspace Structure Cleanup: PascalCase to kebab-case Conversion
 * 
 * This script systematically renames PascalCase files to kebab-case
 * and updates all import references throughout the codebase.
 */

import { readdir, rename, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

interface RenameOperation {
  oldPath: string;
  newPath: string;
  oldName: string;
  newName: string;
}

const KEBAB_CASE_CONVERSIONS: Record<string, string> = {
  // Services
  'ApiManager.ts': 'api-manager.ts',
  'ConversationalGeminiService.ts': 'conversational-gemini-service.ts',
  'ConversationManager.ts': 'conversation-manager.ts',
  'GeminiService.ts': 'gemini-service.ts',
  'HypothesisTournamentService.ts': 'hypothesis-tournament-service.ts',
  'OpenAIService.ts': 'openai-service.ts',
  
  // Testing
  'IntegrationTestFramework.ts': 'integration-test-framework.ts',
  'TestSuiteRunner.ts': 'test-suite-runner.ts',
  'PerformanceBenchmark.ts': 'performance-benchmark.ts',
  'QualityAssurance.ts': 'quality-assurance.ts',
  
  // Cache
  'AnalysisCache.ts': 'analysis-cache.ts',
  'SimpleCache.ts': 'simple-cache.ts',
  
  // Strategies
  'ReasoningStrategy.ts': 'reasoning-strategy.ts',
  'StrategyManager.ts': 'strategy-manager.ts',
  'DeepAnalysisStrategy.new.ts': 'deep-analysis-strategy.new.ts',
  'QuickAnalysisStrategy.new.ts': 'quick-analysis-strategy.new.ts',
  
  // Analyzers
  'HypothesisTester.ts': 'hypothesis-tester.ts',
  
  // Utilities (discovered during cleanup)
  'CodeReader.ts': 'code-reader.ts',
  'EnvironmentValidator.ts': 'environment-validator.ts',
  'ErrorBoundary.ts': 'error-boundary.ts',
  'ErrorClassifier.ts': 'error-classifier.ts',
  'EventBus.ts': 'event-bus.ts',
  'FileSystemAbstraction.ts': 'file-system-abstraction.ts',
  'HealthChecker.ts': 'health-checker.ts',
  'InputValidator.ts': 'input-validator.ts',
  'JsDocGenerator.ts': 'js-doc-generator.ts',
  'Logger.ts': 'logger.ts',
  'MemoryManagementProtocol.ts': 'memory-management-protocol.ts',
  'MemoryManagementProtocolExample.ts': 'memory-management-protocol-example.ts',
  'MemoryManager.ts': 'memory-manager.ts',
  'MemoryOptimizer.ts': 'memory-optimizer.ts',
  'NamingConventions.ts': 'naming-conventions.ts',
  'PerformanceMonitor.ts': 'performance-monitor.ts',
  'PromptSanitizer.ts': 'prompt-sanitizer.ts',
  'ResponseFormatter.ts': 'response-formatter.ts',
  'SecureCodeReader.ts': 'secure-code-reader.ts',
  'ServiceContainer.ts': 'service-container.ts',
  'ServiceFactory.ts': 'service-factory.ts',
  'SimpleServiceManager.ts': 'simple-service-manager.ts',
  'StructuredLogger.ts': 'structured-logger.ts',
  'TypeAdapters.ts': 'type-adapters.ts'
};

async function convertPascalToKebab(text: string): Promise<string> {
  return text
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

async function findFilesToRename(): Promise<RenameOperation[]> {
  const operations: RenameOperation[] = [];
  
  for (const [oldName, newName] of Object.entries(KEBAB_CASE_CONVERSIONS)) {
    // Find the file in the codebase
    try {
      const result = execSync(`find src/ -name "${oldName}" -type f`, { encoding: 'utf-8' }).trim();
      if (result) {
        const oldPath = result;
        const newPath = oldPath.replace(oldName, newName);
        operations.push({ oldPath, newPath, oldName, newName });
      }
    } catch (error) {
      // File doesn't exist, skip
    }
  }
  
  return operations;
}

async function updateImportsInFile(filePath: string, renames: RenameOperation[]): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8');
    let updatedContent = content;
    
    for (const { oldName, newName } of renames) {
      const baseName = oldName.replace('.ts', '');
      const newBaseName = newName.replace('.ts', '');
      
      // Update import paths
      updatedContent = updatedContent.replace(
        new RegExp(`from ['"]([^'"]*/)${baseName}(['"]|\.js['"])`, 'g'),
        `from '$1${newBaseName}$2`
      );
      
      // Update relative imports
      updatedContent = updatedContent.replace(
        new RegExp(`from ['"]\.\/([^'"]*\/)?${baseName}(['"]|\.js['"])`, 'g'),
        `from './$1${newBaseName}$2`
      );
      
      // Update @services, @utils, etc. imports
      updatedContent = updatedContent.replace(
        new RegExp(`from ['"]@([^'"]*)/${baseName}(['"]|\.js['"])`, 'g'),
        `from '@$1/${newBaseName}$2'`
      );
    }
    
    if (updatedContent !== content) {
      await writeFile(filePath, updatedContent, 'utf-8');
      console.log(`✅ Updated imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error);
  }
}

async function updateAllImports(renames: RenameOperation[]): Promise<void> {
  console.log('🔄 Updating import references...\n');
  
  try {
    const result = execSync('find src/ -name "*.ts" -type f', { encoding: 'utf-8' });
    const files = result.trim().split('\n').filter(f => f);
    
    for (const file of files) {
      await updateImportsInFile(file, renames);
    }
  } catch (error) {
    console.error('❌ Error finding TypeScript files:', error);
  }
}

async function performRenames(): Promise<void> {
  console.log('🚀 Starting PascalCase to kebab-case conversion...\n');
  
  const operations = await findFilesToRename();
  
  if (operations.length === 0) {
    console.log('✅ No PascalCase files found to rename.\n');
    return;
  }
  
  console.log(`📋 Found ${operations.length} files to rename:\n`);
  operations.forEach(op => {
    console.log(`   ${op.oldName} → ${op.newName}`);
  });
  console.log('');
  
  // Update imports first
  await updateAllImports(operations);
  
  // Then rename files using git mv to preserve history
  console.log('📂 Renaming files with git mv...\n');
  for (const { oldPath, newPath, oldName, newName } of operations) {
    try {
      execSync(`git mv "${oldPath}" "${newPath}"`, { stdio: 'inherit' });
      console.log(`✅ Renamed: ${oldName} → ${newName}`);
    } catch (error) {
      console.error(`❌ Error renaming ${oldPath}:`, error);
    }
  }
  
  console.log('\n🎉 PascalCase to kebab-case conversion completed!');
}

// Run the conversion
performRenames().catch(console.error);