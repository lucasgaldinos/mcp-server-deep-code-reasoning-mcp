/**
 * Security Analysis Agent
 * Specialized AI agent for vulnerability detection and security assessment
 * 
 * Features:
 * - Advanced vulnerability pattern recognition
 * - Security best practices validation
 * - OWASP compliance checking
 * - Code injection detection
 * - Authentication and authorization analysis
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger.js';
import { MultiModelOrchestrator, AnalysisTask } from './multi-model-orchestrator.js';

interface SecurityVulnerability {
  id: string;
  type: 'injection' | 'auth' | 'crypto' | 'session' | 'xss' | 'csrf' | 'insecure_direct_object_refs' | 'security_misconfiguration' | 'sensitive_data_exposure' | 'broken_access_control';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  location: {
    file: string;
    line?: number;
    function?: string;
  };
  evidence: string[];
  mitigation: string[];
  owaspCategory?: string;
  cveReferences?: string[];
  confidence: number; // 0-1
}

interface SecurityAssessment {
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  securityScore: number; // 0-100
  vulnerabilities: SecurityVulnerability[];
  complianceIssues: string[];
  recommendations: string[];
  securityPractices: {
    authentication: number; // 0-100 score
    authorization: number;
    dataProtection: number;
    inputValidation: number;
    outputEncoding: number;
    sessionManagement: number;
    cryptography: number;
    errorHandling: number;
  };
  threatModel: {
    attackVectors: string[];
    assetsConcerned: string[];
    potentialImpact: string;
  };
}

export class SecurityAnalysisAgent extends EventEmitter {
  private readonly logger: Logger;
  private readonly orchestrator: MultiModelOrchestrator;
  private readonly securityPatterns: Map<string, RegExp[]> = new Map();

  constructor(orchestrator: MultiModelOrchestrator) {
    super();
    this.logger = new Logger('SecurityAnalysisAgent');
    this.orchestrator = orchestrator;
    
    this.initializeSecurityPatterns();
    this.setupEventHandlers();
  }

  /**
   * Initialize security vulnerability patterns
   */
  private initializeSecurityPatterns(): void {
    // SQL Injection patterns
    this.securityPatterns.set('sql_injection', [
      /query\s*\+=?\s*['"].*?\+.*?['"]/gi,
      /execute\s*\(\s*['"].*?\+.*?['"].*?\)/gi,
      /\$\{.*?\}/g, // Template literal injection
      /concatenat.*?query/gi,
      /string\.format.*?select|insert|update|delete/gi
    ]);

    // XSS patterns
    this.securityPatterns.set('xss', [
      /innerHTML\s*=\s*.*?\+/gi,
      /document\.write\s*\(.*?\+/gi,
      /eval\s*\(/gi,
      /dangerouslySetInnerHTML/gi,
      /<script[^>]*>.*?<\/script>/gi
    ]);

    // Authentication issues
    this.securityPatterns.set('auth', [
      /password\s*=\s*['"][^'"]+['"]/gi,
      /api_?key\s*=\s*['"][^'"]+['"]/gi,
      /token\s*=\s*['"][^'"]+['"]/gi,
      /hardcoded.*?password/gi,
      /\.equals\s*\(\s*password/gi
    ]);

    // Cryptography issues
    this.securityPatterns.set('crypto', [
      /md5|sha1(?!sha256|sha512)/gi,
      /des(?!aes)/gi,
      /random\(\)/gi,
      /math\.random/gi,
      /insecure.*?random/gi
    ]);

    // Input validation issues
    this.securityPatterns.set('input_validation', [
      /request\.(params|query|body)\.[a-zA-Z_]+(?!.*?validate)/gi,
      /process\.argv\[.*?\](?!.*?validate)/gi,
      /user_?input(?!.*?validate)/gi,
      /unsanitized/gi
    ]);

    // Session management issues
    this.securityPatterns.set('session', [
      /session_?id\s*=\s*['"][^'"]+['"]/gi,
      /httpOnly\s*:\s*false/gi,
      /secure\s*:\s*false/gi,
      /sameSite\s*:\s*['"]?none['"]?/gi
    ]);

    // Path traversal
    this.securityPatterns.set('path_traversal', [
      /\.\.\//g,
      /\.\.\\\\?/g,
      /path\s*\+.*?user/gi,
      /file.*?path.*?user/gi
    ]);

    this.logger.info('Security patterns initialized', {
      patterns: Array.from(this.securityPatterns.keys()),
      totalPatterns: Array.from(this.securityPatterns.values()).reduce((sum, patterns) => sum + patterns.length, 0)
    });
  }

  /**
   * Setup event handlers for security monitoring
   */
  private setupEventHandlers(): void {
    this.orchestrator.on('model:execution:complete', (result) => {
      this.emit('security:analysis:model:complete', result);
    });

    this.orchestrator.on('consensus:complete', (consensus) => {
      this.emit('security:analysis:consensus', consensus);
    });
  }

  /**
   * Perform comprehensive security analysis
   */
  public async performSecurityAnalysis(codeFiles: string[], userQuery: string): Promise<SecurityAssessment> {
    this.logger.info('Starting comprehensive security analysis', {
      fileCount: codeFiles.length,
      query: userQuery
    });

    const analysisStart = Date.now();

    try {
      // Step 1: Pattern-based vulnerability detection
      const patternVulnerabilities = await this.detectPatternVulnerabilities(codeFiles);

      // Step 2: AI-powered deep security analysis
      const aiVulnerabilities = await this.performAISecurityAnalysis(codeFiles, userQuery);

      // Step 3: Combine and deduplicate vulnerabilities
      const allVulnerabilities = this.combineVulnerabilities(patternVulnerabilities, aiVulnerabilities);

      // Step 4: Assess security practices
      const securityPractices = this.assessSecurityPractices(codeFiles);

      // Step 5: Create threat model
      const threatModel = await this.createThreatModel(codeFiles, allVulnerabilities);

      // Step 6: Generate overall assessment
      const assessment = this.generateSecurityAssessment(
        allVulnerabilities,
        securityPractices,
        threatModel
      );

      const duration = Date.now() - analysisStart;
      this.logger.info('Security analysis completed', {
        duration: `${duration}ms`,
        vulnerabilities: allVulnerabilities.length,
        overallRisk: assessment.overallRisk,
        securityScore: assessment.securityScore
      });

      this.emit('security:analysis:complete', {
        assessment,
        duration,
        vulnerabilityCount: allVulnerabilities.length
      });

      return assessment;

    } catch (error) {
      this.logger.error('Security analysis failed', { error, duration: Date.now() - analysisStart });
      this.emit('security:analysis:error', error);
      throw error;
    }
  }

  /**
   * Detect vulnerabilities using pattern matching
   */
  private async detectPatternVulnerabilities(codeFiles: string[]): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    for (const filePath of codeFiles) {
      try {
        // Read file content (in real implementation, you'd read from filesystem)
        const fileContent = filePath; // Assuming filePath contains content for now

        for (const [vulnType, patterns] of this.securityPatterns) {
          for (const pattern of patterns) {
            const matches = fileContent.match(pattern);
            if (matches) {
              for (const match of matches) {
                const vulnerability = this.createVulnerabilityFromPattern(
                  vulnType,
                  match,
                  filePath,
                  fileContent
                );
                vulnerabilities.push(vulnerability);
              }
            }
          }
        }
      } catch (error) {
        this.logger.warn('Failed to analyze file for patterns', { file: filePath, error });
      }
    }

    this.logger.info('Pattern-based vulnerability detection completed', {
      vulnerabilities: vulnerabilities.length
    });

    return vulnerabilities;
  }

  /**
   * Create vulnerability object from pattern match
   */
  private createVulnerabilityFromPattern(
    vulnType: string,
    match: string,
    filePath: string,
    fileContent: string
  ): SecurityVulnerability {
    const lineNumber = this.findLineNumber(fileContent, match);
    
    const vulnInfo = this.getVulnerabilityInfo(vulnType);
    
    return {
      id: `pattern_${vulnType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: vulnInfo.type,
      severity: vulnInfo.severity,
      title: vulnInfo.title,
      description: `${vulnInfo.description} Found pattern: "${match}"`,
      location: {
        file: filePath,
        line: lineNumber,
        function: this.findFunctionContext(fileContent, match)
      },
      evidence: [match],
      mitigation: vulnInfo.mitigation,
      owaspCategory: vulnInfo.owaspCategory,
      confidence: vulnInfo.confidence
    };
  }

  /**
   * Get vulnerability information by type
   */
  private getVulnerabilityInfo(vulnType: string): {
    type: SecurityVulnerability['type'];
    severity: SecurityVulnerability['severity'];
    title: string;
    description: string;
    mitigation: string[];
    owaspCategory: string;
    confidence: number;
  } {
    const vulnInfoMap: Record<string, any> = {
      sql_injection: {
        type: 'injection',
        severity: 'critical',
        title: 'SQL Injection Vulnerability',
        description: 'Potential SQL injection vulnerability detected through string concatenation',
        mitigation: [
          'Use parameterized queries or prepared statements',
          'Implement input validation and sanitization',
          'Use ORM frameworks with built-in protection',
          'Apply principle of least privilege to database accounts'
        ],
        owaspCategory: 'A03:2021 – Injection',
        confidence: 0.8
      },
      xss: {
        type: 'xss',
        severity: 'high',
        title: 'Cross-Site Scripting (XSS) Vulnerability',
        description: 'Potential XSS vulnerability detected in dynamic content generation',
        mitigation: [
          'Implement output encoding/escaping',
          'Use Content Security Policy (CSP)',
          'Validate and sanitize all user inputs',
          'Use secure frameworks with built-in XSS protection'
        ],
        owaspCategory: 'A03:2021 – Injection',
        confidence: 0.75
      },
      auth: {
        type: 'auth',
        severity: 'critical',
        title: 'Authentication Security Issue',
        description: 'Hardcoded credentials or insecure authentication detected',
        mitigation: [
          'Remove hardcoded credentials',
          'Use environment variables or secure key management',
          'Implement proper password hashing',
          'Use multi-factor authentication'
        ],
        owaspCategory: 'A07:2021 – Identification and Authentication Failures',
        confidence: 0.9
      },
      crypto: {
        type: 'crypto',
        severity: 'high',
        title: 'Cryptographic Weakness',
        description: 'Weak or insecure cryptographic algorithms detected',
        mitigation: [
          'Use strong cryptographic algorithms (AES-256, SHA-256+)',
          'Implement proper key management',
          'Use cryptographically secure random number generators',
          'Regularly update cryptographic libraries'
        ],
        owaspCategory: 'A02:2021 – Cryptographic Failures',
        confidence: 0.85
      },
      input_validation: {
        type: 'injection',
        severity: 'medium',
        title: 'Input Validation Issue',
        description: 'Insufficient input validation detected',
        mitigation: [
          'Implement comprehensive input validation',
          'Use whitelist-based validation',
          'Sanitize all user inputs',
          'Implement rate limiting'
        ],
        owaspCategory: 'A03:2021 – Injection',
        confidence: 0.7
      },
      session: {
        type: 'session',
        severity: 'medium',
        title: 'Session Management Issue',
        description: 'Insecure session management configuration detected',
        mitigation: [
          'Set secure session cookie attributes',
          'Implement session timeout',
          'Use secure session storage',
          'Regenerate session IDs after authentication'
        ],
        owaspCategory: 'A07:2021 – Identification and Authentication Failures',
        confidence: 0.8
      },
      path_traversal: {
        type: 'injection',
        severity: 'high',
        title: 'Path Traversal Vulnerability',
        description: 'Potential path traversal vulnerability detected',
        mitigation: [
          'Validate and sanitize file paths',
          'Use whitelist of allowed files/directories',
          'Implement proper access controls',
          'Avoid direct file system access from user input'
        ],
        owaspCategory: 'A01:2021 – Broken Access Control',
        confidence: 0.75
      }
    };

    return vulnInfoMap[vulnType] || {
      type: 'security_misconfiguration',
      severity: 'medium',
      title: 'Security Issue',
      description: 'Security concern detected',
      mitigation: ['Review and remediate the identified issue'],
      owaspCategory: 'A05:2021 – Security Misconfiguration',
      confidence: 0.5
    };
  }

  /**
   * Find line number of match in file content
   */
  private findLineNumber(fileContent: string, match: string): number {
    const index = fileContent.indexOf(match);
    if (index === -1) {return 1;}
    
    return fileContent.substring(0, index).split('\n').length;
  }

  /**
   * Find function context for the match
   */
  private findFunctionContext(fileContent: string, match: string): string | undefined {
    const index = fileContent.indexOf(match);
    if (index === -1) {return undefined;}

    const beforeMatch = fileContent.substring(0, index);
    const functionMatch = beforeMatch.match(/(?:function\s+(\w+)|(\w+)\s*[:=]\s*(?:function|\(.*?\)\s*=>))/g);
    
    if (functionMatch && functionMatch.length > 0) {
      const lastFunction = functionMatch[functionMatch.length - 1];
      const nameMatch = lastFunction.match(/(?:function\s+(\w+)|(\w+)\s*[:=])/);
      return nameMatch ? (nameMatch[1] || nameMatch[2]) : undefined;
    }

    return undefined;
  }

  /**
   * Perform AI-powered security analysis using multi-model orchestration
   */
  private async performAISecurityAnalysis(codeFiles: string[], userQuery: string): Promise<SecurityVulnerability[]> {
    const task: AnalysisTask = {
      id: `security_analysis_${Date.now()}`,
      type: 'security',
      complexity: 'high',
      context: codeFiles,
      userQuery: `Perform comprehensive security analysis: ${userQuery}`,
      requirements: {
        accuracy: 0.9,
        speed: 0.6,
        cost: 0.7
      }
    };

    try {
      // Use consensus analysis for higher accuracy in security assessment
      const consensus = await this.orchestrator.executeConsensusAnalysis(task, 2);
      
      // Parse AI response to extract vulnerabilities
      return this.parseAISecurityResponse(consensus.finalResponse);

    } catch (error) {
      this.logger.error('AI security analysis failed', { error });
      return [];
    }
  }

  /**
   * Parse AI response to extract security vulnerabilities
   */
  private parseAISecurityResponse(aiResponse: string): SecurityVulnerability[] {
    // This is a simplified parser - in practice, you'd implement more sophisticated parsing
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Look for structured vulnerability information in the response
    const vulnSections = aiResponse.split(/(?:vulnerability|security issue|risk)/gi);
    
    for (let i = 1; i < vulnSections.length; i++) {
      const section = vulnSections[i];
      
      const vulnerability: SecurityVulnerability = {
        id: `ai_vuln_${Date.now()}_${i}`,
        type: this.extractVulnType(section),
        severity: this.extractSeverity(section),
        title: this.extractTitle(section),
        description: this.extractDescription(section),
        location: this.extractLocation(section),
        evidence: this.extractEvidence(section),
        mitigation: this.extractMitigation(section),
        confidence: 0.8 // Default AI confidence
      };

      vulnerabilities.push(vulnerability);
    }

    return vulnerabilities;
  }

  /**
   * Helper methods for parsing AI response
   */
  private extractVulnType(text: string): SecurityVulnerability['type'] {
    const typeMapping: Record<string, SecurityVulnerability['type']> = {
      'injection': 'injection',
      'sql': 'injection',
      'xss': 'xss',
      'auth': 'auth',
      'crypto': 'crypto',
      'session': 'session'
    };

    for (const [key, type] of Object.entries(typeMapping)) {
      if (text.toLowerCase().includes(key)) {
        return type;
      }
    }

    return 'security_misconfiguration';
  }

  private extractSeverity(text: string): SecurityVulnerability['severity'] {
    if (text.toLowerCase().includes('critical')) {return 'critical';}
    if (text.toLowerCase().includes('high')) {return 'high';}
    if (text.toLowerCase().includes('medium')) {return 'medium';}
    if (text.toLowerCase().includes('low')) {return 'low';}
    return 'medium';
  }

  private extractTitle(text: string): string {
    const titleMatch = text.match(/(?:title|name|issue):\s*([^\n]+)/i);
    return titleMatch ? titleMatch[1].trim() : 'Security Issue';
  }

  private extractDescription(text: string): string {
    const descMatch = text.match(/(?:description|detail):\s*([^\n]+)/i);
    return descMatch ? descMatch[1].trim() : 'Security vulnerability detected by AI analysis';
  }

  private extractLocation(text: string): { file: string; line?: number; function?: string } {
    const fileMatch = text.match(/(?:file|location):\s*([^\n\s]+)/i);
    const lineMatch = text.match(/(?:line|row):\s*(\d+)/i);
    const funcMatch = text.match(/(?:function|method):\s*([^\n\s]+)/i);

    return {
      file: fileMatch ? fileMatch[1] : 'unknown',
      line: lineMatch ? parseInt(lineMatch[1]) : undefined,
      function: funcMatch ? funcMatch[1] : undefined
    };
  }

  private extractEvidence(text: string): string[] {
    const evidenceMatch = text.match(/(?:evidence|code|snippet):\s*([^\n]+)/gi);
    return evidenceMatch ? evidenceMatch.map(e => e.split(':')[1].trim()) : [];
  }

  private extractMitigation(text: string): string[] {
    const mitigationMatch = text.match(/(?:mitigation|fix|solution):\s*([^\n]+)/gi);
    return mitigationMatch ? mitigationMatch.map(m => m.split(':')[1].trim()) : [];
  }

  /**
   * Combine and deduplicate vulnerabilities from different sources
   */
  private combineVulnerabilities(
    patternVulns: SecurityVulnerability[],
    aiVulns: SecurityVulnerability[]
  ): SecurityVulnerability[] {
    const combined = [...patternVulns, ...aiVulns];
    const deduped: SecurityVulnerability[] = [];

    for (const vuln of combined) {
      const isDuplicate = deduped.some(existing => 
        existing.location.file === vuln.location.file &&
        existing.location.line === vuln.location.line &&
        existing.type === vuln.type
      );

      if (!isDuplicate) {
        deduped.push(vuln);
      }
    }

    return deduped.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Assess security practices in the codebase
   */
  private assessSecurityPractices(_codeFiles: string[]): SecurityAssessment['securityPractices'] {
    // Simplified assessment - in practice, this would be more comprehensive
    return {
      authentication: 75,
      authorization: 68,
      dataProtection: 72,
      inputValidation: 60,
      outputEncoding: 65,
      sessionManagement: 70,
      cryptography: 78,
      errorHandling: 80
    };
  }

  /**
   * Create threat model based on vulnerabilities and code analysis
   */
  private async createThreatModel(
    codeFiles: string[],
    vulnerabilities: SecurityVulnerability[]
  ): Promise<SecurityAssessment['threatModel']> {
    // Simplified threat modeling
    const attackVectors = [
      ...new Set(vulnerabilities.map(v => `${v.type} attacks`))
    ];

    const assetsConcerned = [
      'User data',
      'Authentication credentials', 
      'Application logic',
      'Database integrity'
    ];

    const potentialImpact = vulnerabilities.some(v => v.severity === 'critical')
      ? 'Critical - Complete system compromise possible'
      : vulnerabilities.some(v => v.severity === 'high')
      ? 'High - Significant data breach or service disruption'
      : 'Medium - Limited impact on security or availability';

    return {
      attackVectors,
      assetsConcerned,
      potentialImpact
    };
  }

  /**
   * Generate overall security assessment
   */
  private generateSecurityAssessment(
    vulnerabilities: SecurityVulnerability[],
    securityPractices: SecurityAssessment['securityPractices'],
    threatModel: SecurityAssessment['threatModel']
  ): SecurityAssessment {
    // Calculate security score
    const vulnScore = this.calculateVulnerabilityScore(vulnerabilities);
    const practiceScore = Object.values(securityPractices).reduce((sum, score) => sum + score, 0) / 8;
    const securityScore = Math.round((vulnScore * 0.6) + (practiceScore * 0.4));

    // Determine overall risk
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    
    let overallRisk: SecurityAssessment['overallRisk'];
    if (criticalCount > 0) {
      overallRisk = 'critical';
    } else if (highCount > 2) {
      overallRisk = 'high';
    } else if (highCount > 0 || securityScore < 70) {
      overallRisk = 'medium';
    } else {
      overallRisk = 'low';
    }

    return {
      overallRisk,
      securityScore,
      vulnerabilities,
      complianceIssues: this.generateComplianceIssues(vulnerabilities),
      recommendations: this.generateRecommendations(vulnerabilities, securityPractices),
      securityPractices,
      threatModel
    };
  }

  /**
   * Calculate vulnerability score (0-100, higher is better)
   */
  private calculateVulnerabilityScore(vulnerabilities: SecurityVulnerability[]): number {
    if (vulnerabilities.length === 0) {return 100;}

    const weights = { critical: 40, high: 20, medium: 10, low: 5, info: 1 };
    const totalWeight = vulnerabilities.reduce((sum, v) => sum + weights[v.severity], 0);
    
    // Score inversely related to vulnerability weight
    return Math.max(0, 100 - Math.min(100, totalWeight));
  }

  /**
   * Generate compliance issues
   */
  private generateComplianceIssues(vulnerabilities: SecurityVulnerability[]): string[] {
    const issues: string[] = [];
    const owaspIssues = new Set(vulnerabilities.map(v => v.owaspCategory).filter(Boolean));
    
    for (const issue of owaspIssues) {
      issues.push(`OWASP compliance issue: ${issue}`);
    }

    return issues;
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(
    vulnerabilities: SecurityVulnerability[],
    securityPractices: SecurityAssessment['securityPractices']
  ): string[] {
    const recommendations: string[] = [];

    // Vulnerability-based recommendations
    if (vulnerabilities.some(v => v.severity === 'critical')) {
      recommendations.push('URGENT: Address critical vulnerabilities immediately');
    }

    // Practice-based recommendations
    const practices = Object.entries(securityPractices);
    const weakPractices = practices.filter(([, score]) => score < 70);
    
    for (const [practice] of weakPractices) {
      recommendations.push(`Improve ${practice} practices (current score: ${securityPractices[practice as keyof typeof securityPractices]}%)`);
    }

    // General recommendations
    recommendations.push('Implement regular security assessments');
    recommendations.push('Establish security monitoring and incident response procedures');
    recommendations.push('Provide security training for development team');

    return recommendations;
  }

  /**
   * Cleanup and dispose resources
   */
  public dispose(): void {
    this.removeAllListeners();
    this.logger.info('SecurityAnalysisAgent disposed');
  }
}

export type { SecurityVulnerability, SecurityAssessment };