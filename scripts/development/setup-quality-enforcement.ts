#!/usr/bin/env tsx
/**
 * @fileoverview Phase 3 Quality Enforcement Setup Script
 * @description Sets up the Phase 3 quality enforcement infrastructure
 */

import { Logger } from '../../src/utils/logger.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import * as process from 'process';

/**
 * Setup Phase 3 Quality Enforcement
 * Configures Git hooks, VS Code tasks, and package.json scripts
 */
async function setupQualityEnforcement(): Promise<void> {
  const logger = new Logger('QualitySetup');
  
  try {
    logger.info('🚦 Setting up Phase 3 Quality Enforcement...');
    
    // Step 1: Ensure scripts are executable
    logger.info('1️⃣ Making quality scripts executable...');
    await makeScriptsExecutable();
    
    // Step 2: Create .husky directory and pre-commit hook
    logger.info('2️⃣ Setting up Git pre-commit hooks...');
    await setupGitHooks();
    
    // Step 3: Create VS Code tasks
    logger.info('3️⃣ Setting up VS Code tasks...');
    await setupVSCodeTasks();
    
    // Step 4: Verify npm scripts
    logger.info('4️⃣ Verifying npm scripts...');
    await verifyNpmScripts();
    
    // Step 5: Test the setup
    logger.info('5️⃣ Testing the setup...');
    await testSetup();
    
    logger.info('🎉 Phase 3 Quality Enforcement setup completed successfully!');
    
    // Show usage instructions
    showUsageInstructions(logger);
    
  } catch (error) {
    logger.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

async function makeScriptsExecutable(): Promise<void> {
  const { execSync } = await import('child_process');
  
  const scripts = [
    'scripts/development/quality-enforcement.ts',
    'scripts/development/quality-validation.ts',
    'scripts/development/quality-gates.ts'
  ];
  
  for (const script of scripts) {
    if (existsSync(script)) {
      execSync(`chmod +x ${script}`);
    }
  }
}

async function setupGitHooks(): Promise<void> {
  // Create .husky directory if it doesn't exist
  if (!existsSync('.husky')) {
    await mkdir('.husky', { recursive: true });
  }
  
  // Create pre-commit hook
  const preCommitHook = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Phase 3 Quality Enforcement - Pre-commit Hook
echo "🚦 Running Quality Gates..."

# Run fast quality gates for pre-commit
npx tsx scripts/development/quality-gates.ts fast

# If fast gates pass, show reminder about full enforcement
if [ $? -eq 0 ]; then
  echo "✅ Fast quality gates passed"
  echo "💡 Run 'npm run quality:enforce' before pushing for full validation"
else
  echo "❌ Fast quality gates failed - commit blocked"
  echo "💡 Run 'npm run quality:validate' to see detailed issues"
  exit 1
fi
`;
  
  await writeFile('.husky/pre-commit', preCommitHook);
  
  // Make pre-commit hook executable
  const { execSync } = await import('child_process');
  execSync('chmod +x .husky/pre-commit');
}

async function setupVSCodeTasks(): Promise<void> {
  const vscodePath = '.vscode';
  const tasksPath = `${vscodePath}/tasks.json`;
  
  // Create .vscode directory if it doesn't exist
  if (!existsSync(vscodePath)) {
    await mkdir(vscodePath, { recursive: true });
  }
  
  // Read existing tasks or create new
  let tasksConfig: any = {
    version: '2.0.0',
    tasks: []
  };
  
  if (existsSync(tasksPath)) {
    try {
      const content = await readFile(tasksPath, 'utf-8');
      tasksConfig = JSON.parse(content);
    } catch (error) {
      // Use default config if parsing fails
    }
  }
  
  // Add quality enforcement tasks
  const qualityTasks = [
    {
      label: '🛡️ Quality Enforcement',
      type: 'shell',
      command: 'npx tsx scripts/development/quality-enforcement.ts',
      group: {
        kind: 'test',
        isDefault: false
      },
      presentation: {
        echo: true,
        reveal: 'always',
        focus: false,
        panel: 'shared'
      },
      problemMatcher: []
    },
    {
      label: '🔍 Quality Validation',
      type: 'shell',
      command: 'npx tsx scripts/development/quality-validation.ts',
      group: {
        kind: 'test',
        isDefault: false
      },
      presentation: {
        echo: true,
        reveal: 'always',
        focus: false,
        panel: 'shared'
      },
      problemMatcher: []
    },
    {
      label: '⚡ Fast Quality Gates',
      type: 'shell',
      command: 'npx tsx scripts/development/quality-gates.ts fast',
      group: {
        kind: 'test',
        isDefault: false
      },
      presentation: {
        echo: true,
        reveal: 'always',
        focus: false,
        panel: 'shared'
      },
      problemMatcher: []
    },
    {
      label: '🚦 Full Quality Gates',
      type: 'shell',
      command: 'npx tsx scripts/development/quality-gates.ts full',
      group: {
        kind: 'test',
        isDefault: false
      },
      presentation: {
        echo: true,
        reveal: 'always',
        focus: false,
        panel: 'shared'
      },
      problemMatcher: []
    }
  ];
  
  // Remove existing quality tasks and add new ones
  tasksConfig.tasks = tasksConfig.tasks.filter((task: any) => 
    !task.label.includes('Quality') && !task.label.includes('🛡️') && !task.label.includes('🔍') && !task.label.includes('⚡') && !task.label.includes('🚦')
  );
  
  tasksConfig.tasks.push(...qualityTasks);
  
  await writeFile(tasksPath, JSON.stringify(tasksConfig, null, 2));
}

async function verifyNpmScripts(): Promise<void> {
  const packageJsonPath = 'package.json';
  const content = await readFile(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(content);
  
  const expectedScripts = {
    'quality:enforce': 'tsx scripts/development/quality-enforcement.ts',
    'quality:validate': 'tsx scripts/development/quality-validation.ts',
    'quality:gates': 'tsx scripts/development/quality-gates.ts'
  };
  
  let updated = false;
  
  for (const [scriptName, command] of Object.entries(expectedScripts)) {
    if (!packageJson.scripts[scriptName]) {
      packageJson.scripts[scriptName] = command;
      updated = true;
    }
  }
  
  if (updated) {
    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }
}

async function testSetup(): Promise<void> {
  const { execSync } = await import('child_process');
  
  try {
    // Test fast quality gates (should be quick)
    execSync('npx tsx scripts/development/quality-gates.ts fast', { 
      stdio: 'pipe',
      timeout: 30000 
    });
  } catch (error) {
    // This is expected to fail due to ESLint issues, but we want to verify the script runs
    if (error instanceof Error && 'status' in error && error.status === 1) {
      // Exit code 1 is expected from quality gates failure, this is good
    } else {
      throw error;
    }
  }
}

function showUsageInstructions(logger: Logger): void {
  logger.info('\n📖 Phase 3 Quality Enforcement Usage:');
  logger.info('');
  logger.info('   🔍 npm run quality:validate   - Non-blocking quality assessment');
  logger.info('   🛡️ npm run quality:enforce    - Blocking quality enforcement');
  logger.info('   ⚡ npm run quality:gates      - Fast quality gates for git hooks');
  logger.info('');
  logger.info('📋 VS Code Tasks:');
  logger.info('   • Ctrl+Shift+P → "Tasks: Run Task" → Select quality task');
  logger.info('');
  logger.info('🔄 Git Integration:');
  logger.info('   • Fast quality gates run automatically on git commit');
  logger.info('   • Pre-push: Run "npm run quality:enforce" manually');
  logger.info('');
  logger.info('🧹 Code Quality Improvement:');
  logger.info('   • Many ESLint issues detected - these will be gradually fixed');
  logger.info('   • Quality gates are intentionally strict to prevent regression');
  logger.info('   • Use "npm run lint -- --fix" to auto-fix some issues');
  logger.info('');
  logger.info('🎯 Next Steps:');
  logger.info('   1. Test with: npm run quality:validate');
  logger.info('   2. Review quality report: ./quality-validation-report.json');
  logger.info('   3. Gradually improve code quality');
  logger.info('   4. Monitor quality trends over time');
}

// Run setup if called directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('setup-quality-enforcement.ts');
if (isMainModule) {
  setupQualityEnforcement().catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

export { setupQualityEnforcement };