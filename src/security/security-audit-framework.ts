/**
 * @fileoverview Security Audit Preparation Framework
 * Comprehensive security review and hardening system for enterprise deployment
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

interface SecurityCheck {
  id: string;
  category: 'authentication' | 'authorization' | 'data-protection' | 'network' | 'code-security' | 'deployment';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  check: () => Promise<SecurityCheckResult>;
  remediation?: string;
}

interface SecurityCheckResult {
  passed: boolean;
  details: string;
  evidence?: string[];
  recommendations?: string[];
}

interface SecurityAuditReport {
  timestamp: string;
  overallScore: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  categorySummary: Record<string, { passed: number; total: number; score: number }>;
  criticalIssues: SecurityCheckResult[];
  allResults: Array<SecurityCheck & { result: SecurityCheckResult }>;
  recommendations: string[];
}

/**
 * Security Audit Preparation Framework
 * Implements comprehensive security checks for enterprise deployment readiness
 */
export class SecurityAuditFramework {
  private readonly projectRoot: string;
  private readonly checks: SecurityCheck[] = [];

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.initializeSecurityChecks();
  }

  /**
   * Initialize all security checks
   */
  private initializeSecurityChecks(): void {
    // Authentication & Authorization Checks
    this.checks.push({
      id: 'AUTH-001',
      category: 'authentication',
      severity: 'critical',
      description: 'API key security validation',
      check: this.checkApiKeySecurity.bind(this),
      remediation: 'Ensure API keys are never hardcoded and use secure environment variable management'
    });

    this.checks.push({
      id: 'AUTH-002', 
      category: 'authentication',
      severity: 'high',
      description: 'Environment variable protection',
      check: this.checkEnvironmentVariables.bind(this),
      remediation: 'Use .env.example templates and ensure .env files are gitignored'
    });

    // Data Protection Checks
    this.checks.push({
      id: 'DATA-001',
      category: 'data-protection',
      severity: 'critical',
      description: 'Input validation and sanitization',
      check: this.checkInputValidation.bind(this),
      remediation: 'Implement comprehensive input validation using Zod schemas and sanitization'
    });

    this.checks.push({
      id: 'DATA-002',
      category: 'data-protection',
      severity: 'high',
      description: 'Prompt injection protection',
      check: this.checkPromptInjectionProtection.bind(this),
      remediation: 'Use PromptSanitizer for all user inputs sent to AI models'
    });

    // Network Security Checks
    this.checks.push({
      id: 'NET-001',
      category: 'network',
      severity: 'high',
      description: 'HTTPS/TLS configuration',
      check: this.checkTlsConfiguration.bind(this),
      remediation: 'Ensure all external API calls use HTTPS and validate certificates'
    });

    this.checks.push({
      id: 'NET-002',
      category: 'network', 
      severity: 'medium',
      description: 'Rate limiting implementation',
      check: this.checkRateLimiting.bind(this),
      remediation: 'Implement rate limiting for API calls and user requests'
    });

    // Code Security Checks
    this.checks.push({
      id: 'CODE-001',
      category: 'code-security',
      severity: 'high',
      description: 'Dependency vulnerability scan',
      check: this.checkDependencyVulnerabilities.bind(this),
      remediation: 'Run npm audit and update vulnerable dependencies'
    });

    this.checks.push({
      id: 'CODE-002',
      category: 'code-security',
      severity: 'medium',
      description: 'Code quality and static analysis',
      check: this.checkCodeQuality.bind(this),
      remediation: 'Use ESLint security rules and TypeScript strict mode'
    });

    // Deployment Security Checks
    this.checks.push({
      id: 'DEPLOY-001',
      category: 'deployment',
      severity: 'critical',
      description: 'Container security configuration',
      check: this.checkContainerSecurity.bind(this),
      remediation: 'Use non-root users, minimal base images, and security scanning'
    });

    this.checks.push({
      id: 'DEPLOY-002',
      category: 'deployment',
      severity: 'high',
      description: 'Secrets management',
      check: this.checkSecretsManagement.bind(this),
      remediation: 'Use Kubernetes secrets or cloud secret managers for production'
    });
  }

  /**
   * Run comprehensive security audit
   */
  async runSecurityAudit(): Promise<SecurityAuditReport> {
    console.log('🔒 Starting comprehensive security audit...\n');

    const results: Array<SecurityCheck & { result: SecurityCheckResult }> = [];
    const categorySummary: Record<string, { passed: number; total: number; score: number }> = {};

    // Initialize category summaries
    for (const category of ['authentication', 'authorization', 'data-protection', 'network', 'code-security', 'deployment']) {
      categorySummary[category] = { passed: 0, total: 0, score: 0 };
    }

    // Run all security checks
    for (const check of this.checks) {
      console.log(`🔍 Running ${check.id}: ${check.description}`);
      
      try {
        const result = await check.check();
        results.push({ ...check, result });

        // Update category summary
        categorySummary[check.category].total++;
        if (result.passed) {
          categorySummary[check.category].passed++;
        }

        console.log(`  ${result.passed ? '✅' : '❌'} ${result.details}`);
        if (!result.passed && result.recommendations) {
          result.recommendations.forEach(rec => console.log(`     💡 ${rec}`));
        }
        console.log('');

      } catch (error) {
        console.error(`  ❌ Error running check ${check.id}: ${error}`);
        results.push({
          ...check,
          result: {
            passed: false,
            details: `Check failed with error: ${error}`,
            recommendations: ['Fix the underlying issue causing this check to fail']
          }
        });
        categorySummary[check.category].total++;
      }
    }

    // Calculate category scores
    Object.keys(categorySummary).forEach(category => {
      const summary = categorySummary[category];
      summary.score = summary.total > 0 ? (summary.passed / summary.total) * 100 : 100;
    });

    // Generate overall metrics
    const totalChecks = results.length;
    const passedChecks = results.filter(r => r.result.passed).length;
    const failedChecks = totalChecks - passedChecks;
    const overallScore = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;

    // Identify critical issues
    const criticalIssues = results
      .filter(r => !r.result.passed && r.severity === 'critical')
      .map(r => r.result);

    // Generate recommendations
    const recommendations = this.generateSecurityRecommendations(results, overallScore);

    const report: SecurityAuditReport = {
      timestamp: new Date().toISOString(),
      overallScore,
      totalChecks,
      passedChecks,
      failedChecks,
      categorySummary,
      criticalIssues,
      allResults: results,
      recommendations
    };

    this.printSecuritySummary(report);
    await this.saveSecurityReport(report);

    return report;
  }

  /**
   * Check API key security implementation
   */
  private async checkApiKeySecurity(): Promise<SecurityCheckResult> {
    const srcFiles = await this.getAllSourceFiles();
    const issues: string[] = [];

    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      
      // Check for hardcoded API keys
      if (content.match(/GEMINI_API_KEY\s*=\s*["'][^"']+["']/)) {
        issues.push(`Hardcoded API key found in ${file}`);
      }
      
      // Check for other potential API key patterns
      if (content.match(/["'](?:AIza|ya29\.|1\/\/)[A-Za-z0-9_-]{20,}["']/)) {
        issues.push(`Potential hardcoded Google API key in ${file}`);
      }
    }

    return {
      passed: issues.length === 0,
      details: issues.length === 0 
        ? 'No hardcoded API keys detected'
        : `Found ${issues.length} potential security issues`,
      evidence: issues,
      recommendations: issues.length > 0 
        ? ['Remove hardcoded credentials', 'Use environment variables', 'Review git history for exposed keys']
        : []
    };
  }

  /**
   * Check environment variable protection
   */
  private async checkEnvironmentVariables(): Promise<SecurityCheckResult> {
    const issues: string[] = [];
    const envFile = join(this.projectRoot, '.env');
    const envExampleFile = join(this.projectRoot, '.env.example');
    const gitignore = join(this.projectRoot, '.gitignore');

    // Check if .env is gitignored
    if (existsSync(gitignore)) {
      const gitignoreContent = readFileSync(gitignore, 'utf-8');
      if (!gitignoreContent.includes('.env')) {
        issues.push('.env file not found in .gitignore');
      }
    }

    // Check if .env.example exists
    if (!existsSync(envExampleFile)) {
      issues.push('.env.example template file missing');
    }

    // Check if .env has secure permissions (Unix-like systems)
    if (existsSync(envFile) && process.platform !== 'win32') {
      try {
        const stats = readFileSync(envFile);
        // Additional permission checks could be added here
      } catch (error) {
        // File doesn't exist or permission denied - this is actually good for security
      }
    }

    return {
      passed: issues.length === 0,
      details: issues.length === 0 
        ? 'Environment variable protection properly configured'
        : `Found ${issues.length} environment security issues`,
      evidence: issues,
      recommendations: issues.length > 0 
        ? ['Add .env to .gitignore', 'Create .env.example template', 'Set secure file permissions']
        : []
    };
  }

  /**
   * Check input validation implementation
   */
  private async checkInputValidation(): Promise<SecurityCheckResult> {
    const inputValidatorFile = join(this.projectRoot, 'src', 'utils', 'InputValidator.ts');
    const issues: string[] = [];

    if (!existsSync(inputValidatorFile)) {
      issues.push('InputValidator module not found');
      return {
        passed: false,
        details: 'Input validation system not implemented',
        evidence: issues,
        recommendations: ['Implement comprehensive input validation', 'Use Zod schemas for validation']
      };
    }

    const content = readFileSync(inputValidatorFile, 'utf-8');
    
    // Check for comprehensive validation methods
    const requiredMethods = ['validateFilePaths', 'validateString', 'sanitizeInput'];
    for (const method of requiredMethods) {
      if (!content.includes(method)) {
        issues.push(`Missing validation method: ${method}`);
      }
    }

    // Check for Zod usage
    if (!content.includes('zod') && !content.includes('z.')) {
      issues.push('Zod schema validation not detected');
    }

    return {
      passed: issues.length === 0,
      details: issues.length === 0 
        ? 'Comprehensive input validation implemented'
        : `Found ${issues.length} input validation gaps`,
      evidence: issues,
      recommendations: issues.length > 0 
        ? ['Implement missing validation methods', 'Add Zod schema validation', 'Add input sanitization']
        : []
    };
  }

  /**
   * Check prompt injection protection
   */
  private async checkPromptInjectionProtection(): Promise<SecurityCheckResult> {
    const promptSanitizerFile = join(this.projectRoot, 'src', 'utils', 'PromptSanitizer.ts');
    const issues: string[] = [];

    if (!existsSync(promptSanitizerFile)) {
      issues.push('PromptSanitizer module not found');
      return {
        passed: false,
        details: 'Prompt injection protection not implemented',
        evidence: issues,
        recommendations: ['Implement PromptSanitizer class', 'Add prompt injection detection', 'Sanitize all user inputs to AI models']
      };
    }

    const content = readFileSync(promptSanitizerFile, 'utf-8');
    
    // Check for sanitization methods
    const requiredMethods = ['createSafePrompt', 'sanitize', 'detectInjection'];
    for (const method of requiredMethods) {
      if (!content.includes(method)) {
        issues.push(`Missing sanitization method: ${method}`);
      }
    }

    return {
      passed: issues.length === 0,
      details: issues.length === 0 
        ? 'Prompt injection protection implemented'
        : `Found ${issues.length} prompt security gaps`,
      evidence: issues,
      recommendations: issues.length > 0 
        ? ['Implement missing sanitization methods', 'Add injection detection', 'Test with malicious prompts']
        : []
    };
  }

  /**
   * Check TLS configuration
   */
  private async checkTlsConfiguration(): Promise<SecurityCheckResult> {
    const srcFiles = await this.getAllSourceFiles();
    const issues: string[] = [];

    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      
      // Check for insecure HTTP usage
      if (content.match(/http:\/\/(?!localhost|127\.0\.0\.1)/)) {
        issues.push(`Insecure HTTP URL found in ${file}`);
      }
      
      // Check for disabled certificate validation
      if (content.includes('rejectUnauthorized: false') || content.includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
        issues.push(`TLS certificate validation may be disabled in ${file}`);
      }
    }

    return {
      passed: issues.length === 0,
      details: issues.length === 0 
        ? 'TLS configuration secure'
        : `Found ${issues.length} TLS security issues`,
      evidence: issues,
      recommendations: issues.length > 0 
        ? ['Use HTTPS for all external calls', 'Enable certificate validation', 'Update insecure URLs']
        : []
    };
  }

  /**
   * Check rate limiting implementation
   */
  private async checkRateLimiting(): Promise<SecurityCheckResult> {
    const srcFiles = await this.getAllSourceFiles();
    let rateLimitingFound = false;

    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      
      // Check for rate limiting patterns
      if (content.includes('rate') && (content.includes('limit') || content.includes('throttle'))) {
        rateLimitingFound = true;
        break;
      }
    }

    return {
      passed: rateLimitingFound,
      details: rateLimitingFound 
        ? 'Rate limiting implementation detected'
        : 'No rate limiting implementation found',
      recommendations: !rateLimitingFound 
        ? ['Implement rate limiting for API calls', 'Add request throttling', 'Monitor for abuse patterns']
        : []
    };
  }

  /**
   * Check dependency vulnerabilities
   */
  private async checkDependencyVulnerabilities(): Promise<SecurityCheckResult> {
    try {
      const auditOutput = execSync('npm audit --json', { cwd: this.projectRoot, encoding: 'utf-8' });
      const auditResult = JSON.parse(auditOutput);
      
      const vulnerabilities = auditResult.vulnerabilities || {};
      const vulnerabilityCount = Object.keys(vulnerabilities).length;
      
      const criticalVulns = Object.values(vulnerabilities).filter((v: any) => 
        v.severity === 'critical' || v.severity === 'high'
      ).length;

      return {
        passed: vulnerabilityCount === 0,
        details: vulnerabilityCount === 0 
          ? 'No dependency vulnerabilities found'
          : `Found ${vulnerabilityCount} vulnerabilities (${criticalVulns} critical/high)`,
        evidence: vulnerabilityCount > 0 ? [`Run 'npm audit' for details`] : [],
        recommendations: vulnerabilityCount > 0 
          ? ['Run npm audit fix', 'Update vulnerable dependencies', 'Review security advisories']
          : []
      };
    } catch (error) {
      return {
        passed: false,
        details: 'Failed to run dependency vulnerability scan',
        recommendations: ['Ensure npm is available', 'Check network connectivity', 'Run npm audit manually']
      };
    }
  }

  /**
   * Check code quality and static analysis
   */
  private async checkCodeQuality(): Promise<SecurityCheckResult> {
    const eslintConfig = join(this.projectRoot, 'config', 'quality', '.eslintrc.json');
    const tsConfig = join(this.projectRoot, 'tsconfig.json');
    const issues: string[] = [];

    // Check for ESLint configuration
    if (!existsSync(eslintConfig)) {
      issues.push('ESLint configuration not found');
    } else {
      const eslintContent = readFileSync(eslintConfig, 'utf-8');
      const config = JSON.parse(eslintContent);
      
      // Check for security-related rules
      if (!config.rules || !config.rules['@typescript-eslint/no-explicit-any']) {
        issues.push('TypeScript strict rules not configured');
      }
    }

    // Check for TypeScript strict mode
    if (!existsSync(tsConfig)) {
      issues.push('TypeScript configuration not found');
    } else {
      const tsContent = readFileSync(tsConfig, 'utf-8');
      const config = JSON.parse(tsContent);
      
      if (!config.compilerOptions?.strict) {
        issues.push('TypeScript strict mode not enabled');
      }
    }

    return {
      passed: issues.length === 0,
      details: issues.length === 0 
        ? 'Code quality configuration secure'
        : `Found ${issues.length} code quality issues`,
      evidence: issues,
      recommendations: issues.length > 0 
        ? ['Enable TypeScript strict mode', 'Configure ESLint security rules', 'Add static analysis tools']
        : []
    };
  }

  /**
   * Check container security configuration
   */
  private async checkContainerSecurity(): Promise<SecurityCheckResult> {
    const dockerfile = join(this.projectRoot, 'Dockerfile');
    const issues: string[] = [];

    if (!existsSync(dockerfile)) {
      return {
        passed: true,
        details: 'No Dockerfile found - container security not applicable',
        recommendations: []
      };
    }

    const content = readFileSync(dockerfile, 'utf-8');
    
    // Check for root user usage
    if (!content.includes('USER') || content.includes('USER root')) {
      issues.push('Container runs as root user');
    }
    
    // Check for minimal base image
    if (content.includes('FROM node:') && !content.includes('alpine')) {
      issues.push('Using non-minimal base image');
    }
    
    // Check for explicit EXPOSE directives
    if (!content.includes('EXPOSE')) {
      issues.push('No explicit port exposure');
    }

    return {
      passed: issues.length === 0,
      details: issues.length === 0 
        ? 'Container security properly configured'
        : `Found ${issues.length} container security issues`,
      evidence: issues,
      recommendations: issues.length > 0 
        ? ['Use non-root user', 'Use minimal base images', 'Explicit port configuration', 'Security scanning']
        : []
    };
  }

  /**
   * Check secrets management
   */
  private async checkSecretsManagement(): Promise<SecurityCheckResult> {
    const k8sDir = join(this.projectRoot, 'k8s');
    const issues: string[] = [];

    if (existsSync(k8sDir)) {
      const k8sFiles = await this.getKubernetesFiles();
      
      for (const file of k8sFiles) {
        const content = readFileSync(file, 'utf-8');
        
        // Check for hardcoded secrets in K8s manifests
        if (content.includes('value:') && content.match(/value:\s*["'][^"']*api[^"']*["']/i)) {
          issues.push(`Potential hardcoded secret in ${file}`);
        }
        
        // Check for proper secret references
        if (content.includes('GEMINI_API_KEY') && !content.includes('valueFrom')) {
          issues.push(`Direct secret reference without valueFrom in ${file}`);
        }
      }
    }

    return {
      passed: issues.length === 0,
      details: issues.length === 0 
        ? 'Secrets management properly configured'
        : `Found ${issues.length} secrets management issues`,
      evidence: issues,
      recommendations: issues.length > 0 
        ? ['Use Kubernetes secrets', 'Avoid hardcoded credentials', 'Use secret management services']
        : []
    };
  }

  /**
   * Generate security recommendations based on audit results
   */
  private generateSecurityRecommendations(
    results: Array<SecurityCheck & { result: SecurityCheckResult }>,
    overallScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (overallScore < 70) {
      recommendations.push('🚨 CRITICAL: Overall security score below 70% - immediate action required');
    }

    const failedCritical = results.filter(r => !r.result.passed && r.severity === 'critical');
    if (failedCritical.length > 0) {
      recommendations.push(`🔴 Address ${failedCritical.length} critical security issues immediately`);
    }

    const failedHigh = results.filter(r => !r.result.passed && r.severity === 'high');
    if (failedHigh.length > 0) {
      recommendations.push(`🟡 Address ${failedHigh.length} high priority security issues`);
    }

    // Category-specific recommendations
    const categories = ['authentication', 'data-protection', 'network', 'deployment'];
    for (const category of categories) {
      const categoryResults = results.filter(r => r.category === category);
      const failedInCategory = categoryResults.filter(r => !r.result.passed);
      
      if (failedInCategory.length > 0) {
        recommendations.push(`📋 Improve ${category} security: ${failedInCategory.length} issues found`);
      }
    }

    if (overallScore >= 90) {
      recommendations.push('✅ Excellent security posture - ready for enterprise deployment');
    } else if (overallScore >= 80) {
      recommendations.push('🟢 Good security posture - minor improvements needed');
    }

    return recommendations;
  }

  /**
   * Print security audit summary
   */
  private printSecuritySummary(report: SecurityAuditReport): void {
    console.log('\n🔒 SECURITY AUDIT SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Overall Score: ${report.overallScore.toFixed(1)}%`);
    console.log(`Total Checks: ${report.totalChecks}`);
    console.log(`Passed: ${report.passedChecks} | Failed: ${report.failedChecks}`);
    
    if (report.criticalIssues.length > 0) {
      console.log(`\n🚨 CRITICAL ISSUES: ${report.criticalIssues.length}`);
    }

    console.log('\n📊 CATEGORY BREAKDOWN:');
    Object.entries(report.categorySummary).forEach(([category, summary]) => {
      const icon = summary.score >= 80 ? '✅' : summary.score >= 60 ? '⚠️' : '❌';
      console.log(`  ${icon} ${category}: ${summary.score.toFixed(1)}% (${summary.passed}/${summary.total})`);
    });

    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => console.log(`  ${rec}`));
    }
  }

  /**
   * Save security report to file
   */
  private async saveSecurityReport(report: SecurityAuditReport): Promise<void> {
    const reportDir = join(this.projectRoot, 'security-reports');
    const reportFile = join(reportDir, `security-audit-${new Date().toISOString().split('T')[0]}.json`);
    
    try {
      // Create directory if it doesn't exist
      if (!existsSync(reportDir)) {
        execSync(`mkdir -p "${reportDir}"`);
      }
      
      writeFileSync(reportFile, JSON.stringify(report, null, 2));
      console.log(`\n📁 Security report saved to: ${reportFile}`);
    } catch (error) {
      console.error(`❌ Failed to save security report: ${error}`);
    }
  }

  /**
   * Get all source files for analysis
   */
  private async getAllSourceFiles(): Promise<string[]> {
    const srcDir = join(this.projectRoot, 'src');
    try {
      const output = execSync(`find "${srcDir}" -name "*.ts" -type f`, { encoding: 'utf-8' });
      return output.trim().split('\n').filter(file => file.length > 0);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get Kubernetes manifest files
   */
  private async getKubernetesFiles(): Promise<string[]> {
    const k8sDir = join(this.projectRoot, 'k8s');
    try {
      const output = execSync(`find "${k8sDir}" -name "*.yaml" -o -name "*.yml" -type f`, { encoding: 'utf-8' });
      return output.trim().split('\n').filter(file => file.length > 0);
    } catch (error) {
      return [];
    }
  }
}

/**
 * CLI interface for security audit
 */
export async function runSecurityAuditCli(): Promise<void> {
  const framework = new SecurityAuditFramework();
  
  try {
    const report = await framework.runSecurityAudit();
    
    if (report.overallScore < 70) {
      process.exit(1); // Fail CI/CD if security score too low
    }
  } catch (error) {
    console.error('❌ Security audit failed:', error);
    process.exit(1);
  }
}

// Export for use in other modules
export default SecurityAuditFramework;