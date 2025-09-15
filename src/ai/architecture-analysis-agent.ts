/**
 * Architecture Analysis Agent
 * Specialized AI agent for software architecture assessment and recommendations
 * 
 * Features:
 * - Design pattern analysis
 * - SOLID principles validation
 * - Architectural debt assessment
 * - Dependency analysis and optimization
 * - Modularity and coupling evaluation
 * - Scalability architecture recommendations
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger.js';
import { MultiModelOrchestrator, AnalysisTask } from './multi-model-orchestrator.js';

interface ArchitecturalIssue {
  id: string;
  category: 'design_pattern' | 'solid_violation' | 'coupling' | 'cohesion' | 'dependency' | 'scalability' | 'maintainability' | 'testability';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location: {
    file: string;
    module?: string;
    class?: string;
    function?: string;
    lineRange?: { start: number; end: number };
  };
  principle: string; // SOLID principle or design principle violated
  currentPattern: string;
  suggestedPattern: string;
  impact: {
    maintainability: number; // 0-100 impact score
    testability: number;
    scalability: number;
    performance: number;
    teamVelocity: number;
  };
  refactoringEffort: 'low' | 'medium' | 'high' | 'very_high';
  businessJustification: string;
  technicalDebt: number; // Estimated debt in hours
}

interface DependencyIssue {
  type: 'circular' | 'unnecessary' | 'version_conflict' | 'security' | 'license' | 'outdated' | 'heavy_weight';
  source: string;
  target: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
  alternatives?: string[];
}

interface ModuleMetrics {
  name: string;
  linesOfCode: number;
  complexity: number; // Cyclomatic complexity
  coupling: {
    afferent: number; // Incoming dependencies
    efferent: number; // Outgoing dependencies
    instability: number; // Efferent / (Afferent + Efferent)
  };
  cohesion: number; // 0-100 score
  responsibilities: string[];
  violations: string[];
}

interface ArchitecturalPattern {
  name: string;
  description: string;
  isImplemented: boolean;
  implementationQuality: number; // 0-100 score
  benefits: string[];
  drawbacks: string[];
  recommendations: string[];
}

interface ArchitectureAssessment {
  overallScore: number; // 0-100 architecture quality score
  architecturalGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: ArchitecturalIssue[];
  dependencyIssues: DependencyIssue[];
  moduleMetrics: ModuleMetrics[];
  patterns: ArchitecturalPattern[];
  principles: {
    singleResponsibility: number; // 0-100 compliance score
    openClosed: number;
    liskovSubstitution: number;
    interfaceSegregation: number;
    dependencyInversion: number;
  };
  qualityAttributes: {
    maintainability: number; // 0-100 score
    testability: number;
    scalability: number;
    performance: number;
    security: number;
    usability: number;
  };
  technicalDebt: {
    totalHours: number;
    priority: {
      immediate: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    strategic: string[];
  };
}

export class ArchitectureAnalysisAgent extends EventEmitter {
  private readonly logger: Logger;
  private readonly orchestrator: MultiModelOrchestrator;
  private readonly architecturalPatterns: Map<string, RegExp[]> = new Map();
  private readonly solidViolationPatterns: Map<string, RegExp[]> = new Map();

  constructor(orchestrator: MultiModelOrchestrator) {
    super();
    this.logger = new Logger('ArchitectureAnalysisAgent');
    this.orchestrator = orchestrator;
    
    this.initializeArchitecturalPatterns();
    this.initializeSolidViolationPatterns();
    this.setupEventHandlers();
  }

  /**
   * Initialize architectural pattern detection patterns
   */
  private initializeArchitecturalPatterns(): void {
    // Singleton pattern detection
    this.architecturalPatterns.set('singleton', [
      /class\s+\w+\s*\{[^}]*private\s+static\s+\w+\s*:/gi,
      /private\s+constructor\s*\(/gi,
      /static\s+getInstance\s*\(/gi,
      /static\s+instance\s*[:=]/gi
    ]);

    // Factory pattern detection
    this.architecturalPatterns.set('factory', [
      /class\s+\w*Factory\w*/gi,
      /create\w+\s*\([^)]*\)\s*:\s*\w+/gi,
      /make\w+\s*\([^)]*\)\s*:\s*\w+/gi,
      /build\w+\s*\([^)]*\)\s*:\s*\w+/gi
    ]);

    // Observer pattern detection
    this.architecturalPatterns.set('observer', [
      /addEventListener|on\w+|subscribe/gi,
      /removeEventListener|off\w+|unsubscribe/gi,
      /notify|emit|trigger/gi,
      /Observer|Subject|EventEmitter/gi
    ]);

    // Strategy pattern detection
    this.architecturalPatterns.set('strategy', [
      /interface\s+\w*Strategy\w*/gi,
      /class\s+\w*Strategy\w*/gi,
      /setStrategy|changeStrategy/gi,
      /execute\s*\([^)]*\)/gi
    ]);

    // Command pattern detection
    this.architecturalPatterns.set('command', [
      /interface\s+\w*Command\w*/gi,
      /class\s+\w*Command\w*/gi,
      /execute\s*\(\s*\)/gi,
      /undo\s*\(\s*\)/gi
    ]);

    // Repository pattern detection
    this.architecturalPatterns.set('repository', [
      /class\s+\w*Repository\w*/gi,
      /interface\s+\w*Repository\w*/gi,
      /findBy|getBy|save|delete|update/gi,
      /findAll|getAll|findOne|getOne/gi
    ]);

    // MVC pattern detection
    this.architecturalPatterns.set('mvc', [
      /class\s+\w*Controller\w*/gi,
      /class\s+\w*Model\w*/gi,
      /class\s+\w*View\w*/gi,
      /route|endpoint|action/gi
    ]);

    // Dependency Injection detection
    this.architecturalPatterns.set('dependency_injection', [
      /@Inject|@Injectable|@Component/gi,
      /constructor\s*\([^)]*:\s*\w+/gi,
      /inject|provide|container/gi,
      /IOC|DI|ServiceLocator/gi
    ]);

    this.logger.info('Architectural patterns initialized', {
      patterns: Array.from(this.architecturalPatterns.keys()),
      totalPatterns: Array.from(this.architecturalPatterns.values()).reduce((sum, patterns) => sum + patterns.length, 0)
    });
  }

  /**
   * Initialize SOLID principle violation patterns
   */
  private initializeSolidViolationPatterns(): void {
    // Single Responsibility Principle violations
    this.solidViolationPatterns.set('srp_violation', [
      /class\s+\w+\s*\{[^}]*(?:save|persist|store)[^}]*(?:validate|check|verify)[^}]*\}/gi,
      /class\s+\w+\s*\{[^}]*(?:send|email|notify)[^}]*(?:log|audit|track)[^}]*\}/gi,
      /class\s+\w+\s*\{[^}]*(?:parse|format)[^}]*(?:save|store)[^}]*\}/gi,
      /class\s+\w+\s*\{[^}]*(?:calculate|compute)[^}]*(?:display|render|show)[^}]*\}/gi
    ]);

    // Open-Closed Principle violations
    this.solidViolationPatterns.set('ocp_violation', [
      /if\s*\(\s*type\s*===?\s*['"]\w+['"]|switch\s*\(\s*type\s*\)/gi,
      /instanceof\s+\w+\s*\)\s*\{[^}]*if.*instanceof/gi,
      /case\s+['"]\w+['"]:[^:]*case\s+['"]\w+['"]:/gi
    ]);

    // Liskov Substitution Principle violations
    this.solidViolationPatterns.set('lsp_violation', [
      /throw\s+new\s+(?:NotImplemented|UnsupportedOperation|NotSupported)/gi,
      /return\s+null|return\s+undefined/gi, // In overridden methods
      /override.*throw/gi
    ]);

    // Interface Segregation Principle violations
    this.solidViolationPatterns.set('isp_violation', [
      /interface\s+\w+\s*\{[^}]*(?:method|function)[^}]*(?:method|function)[^}]*(?:method|function)[^}]*(?:method|function)[^}]*\}/gi,
      /implements\s+\w+[^{]*\{[^}]*throw.*NotImplemented[^}]*\}/gi
    ]);

    // Dependency Inversion Principle violations
    this.solidViolationPatterns.set('dip_violation', [
      /new\s+(?:FileSystem|Database|HttpClient|EmailService)/gi,
      /import.*(?:fs|path|http|mysql|mongodb).*from/gi,
      /require\s*\(\s*['"](?:fs|path|http|mysql|mongodb)/gi
    ]);

    // High coupling patterns
    this.solidViolationPatterns.set('high_coupling', [
      /import.*\{[^}]{100,}\}/gi, // Large import statements
      /class\s+\w+\s*\{[^}]*new\s+\w+[^}]*new\s+\w+[^}]*new\s+\w+/gi, // Multiple instantiations
      /this\.\w+\.\w+\.\w+\.\w+/gi // Deep property access
    ]);

    // Low cohesion patterns
    this.solidViolationPatterns.set('low_cohesion', [
      /class\s+\w+\s*\{[^}]*(?:user|customer)[^}]*(?:order|payment)[^}]*(?:email|notification)/gi,
      /class\s+\w+\s*\{[^}]*(?:calculate|compute)[^}]*(?:display|render)[^}]*(?:save|store)/gi
    ]);

    this.logger.info('SOLID violation patterns initialized', {
      patterns: Array.from(this.solidViolationPatterns.keys()),
      totalPatterns: Array.from(this.solidViolationPatterns.values()).reduce((sum, patterns) => sum + patterns.length, 0)
    });
  }

  /**
   * Setup event handlers for architecture monitoring
   */
  private setupEventHandlers(): void {
    this.orchestrator.on('model:execution:complete', (result) => {
      this.emit('architecture:analysis:model:complete', result);
    });

    this.orchestrator.on('consensus:complete', (consensus) => {
      this.emit('architecture:analysis:consensus', consensus);
    });
  }

  /**
   * Perform comprehensive architecture analysis
   */
  public async performArchitectureAnalysis(
    codeFiles: string[],
    userQuery: string,
    projectMetadata?: { 
      packageJson?: any; 
      dependencies?: string[]; 
      projectType?: string;
    }
  ): Promise<ArchitectureAssessment> {
    this.logger.info('Starting comprehensive architecture analysis', {
      fileCount: codeFiles.length,
      query: userQuery,
      hasMetadata: !!projectMetadata
    });

    const analysisStart = Date.now();

    try {
      // Step 1: Pattern-based architectural issue detection
      const patternIssues = await this.detectArchitecturalIssues(codeFiles);

      // Step 2: AI-powered deep architecture analysis
      const aiIssues = await this.performAIArchitectureAnalysis(codeFiles, userQuery);

      // Step 3: Dependency analysis
      const dependencyIssues = await this.analyzeDependencies(codeFiles, projectMetadata);

      // Step 4: Module metrics calculation
      const moduleMetrics = this.calculateModuleMetrics(codeFiles);

      // Step 5: Pattern recognition
      const patterns = this.recognizeArchitecturalPatterns(codeFiles);

      // Step 6: SOLID principles assessment
      const principles = this.assessSolidPrinciples(codeFiles);

      // Step 7: Quality attributes evaluation
      const qualityAttributes = this.evaluateQualityAttributes(patternIssues, aiIssues, moduleMetrics);

      // Step 8: Technical debt calculation
      const technicalDebt = this.calculateTechnicalDebt([...patternIssues, ...aiIssues]);

      // Step 9: Generate recommendations
      const recommendations = await this.generateArchitectureRecommendations(
        [...patternIssues, ...aiIssues],
        dependencyIssues,
        moduleMetrics,
        patterns
      );

      // Step 10: Create final assessment
      const assessment = this.generateArchitectureAssessment(
        [...patternIssues, ...aiIssues],
        dependencyIssues,
        moduleMetrics,
        patterns,
        principles,
        qualityAttributes,
        technicalDebt,
        recommendations
      );

      const duration = Date.now() - analysisStart;
      this.logger.info('Architecture analysis completed', {
        duration: `${duration}ms`,
        issues: patternIssues.length + aiIssues.length,
        overallScore: assessment.overallScore,
        grade: assessment.architecturalGrade
      });

      this.emit('architecture:analysis:complete', {
        assessment,
        duration,
        issueCount: patternIssues.length + aiIssues.length
      });

      return assessment;

    } catch (error) {
      this.logger.error('Architecture analysis failed', { error, duration: Date.now() - analysisStart });
      this.emit('architecture:analysis:error', error);
      throw error;
    }
  }

  /**
   * Detect architectural issues using pattern matching
   */
  private async detectArchitecturalIssues(codeFiles: string[]): Promise<ArchitecturalIssue[]> {
    const issues: ArchitecturalIssue[] = [];

    for (const filePath of codeFiles) {
      try {
        const fileContent = filePath; // Assuming filePath contains content for now

        for (const [violationType, patterns] of this.solidViolationPatterns) {
          for (const pattern of patterns) {
            const matches = fileContent.match(pattern);
            if (matches) {
              for (const match of matches) {
                const issue = this.createArchitecturalIssueFromPattern(
                  violationType,
                  match,
                  filePath,
                  fileContent
                );
                issues.push(issue);
              }
            }
          }
        }
      } catch (error) {
        this.logger.warn('Failed to analyze file for architectural patterns', { file: filePath, error });
      }
    }

    this.logger.info('Pattern-based architectural issue detection completed', {
      issues: issues.length
    });

    return issues;
  }

  /**
   * Create architectural issue from pattern match
   */
  private createArchitecturalIssueFromPattern(
    violationType: string,
    match: string,
    filePath: string,
    fileContent: string
  ): ArchitecturalIssue {
    const lineNumber = this.findLineNumber(fileContent, match);
    const classContext = this.findClassContext(fileContent, match);
    const functionContext = this.findFunctionContext(fileContent, match);
    
    const issueInfo = this.getArchitecturalIssueInfo(violationType);
    
    return {
      id: `arch_${violationType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: issueInfo.category,
      severity: issueInfo.severity,
      title: issueInfo.title,
      description: `${issueInfo.description} Found pattern: "${match.substring(0, 100)}..."`,
      location: {
        file: filePath,
        module: this.extractModuleName(filePath),
        class: classContext,
        function: functionContext,
        lineRange: { start: lineNumber, end: lineNumber + this.countLines(match) }
      },
      principle: issueInfo.principle,
      currentPattern: issueInfo.currentPattern,
      suggestedPattern: issueInfo.suggestedPattern,
      impact: issueInfo.impact,
      refactoringEffort: issueInfo.refactoringEffort,
      businessJustification: issueInfo.businessJustification,
      technicalDebt: issueInfo.technicalDebt
    };
  }

  /**
   * Get architectural issue information by violation type
   */
  private getArchitecturalIssueInfo(violationType: string): {
    category: ArchitecturalIssue['category'];
    severity: ArchitecturalIssue['severity'];
    title: string;
    description: string;
    principle: string;
    currentPattern: string;
    suggestedPattern: string;
    impact: ArchitecturalIssue['impact'];
    refactoringEffort: ArchitecturalIssue['refactoringEffort'];
    businessJustification: string;
    technicalDebt: number;
  } {
    const issueInfoMap: Record<string, any> = {
      srp_violation: {
        category: 'solid_violation',
        severity: 'high',
        title: 'Single Responsibility Principle Violation',
        description: 'Class or module has multiple responsibilities, violating SRP',
        principle: 'Single Responsibility Principle',
        currentPattern: 'God Class / Multi-responsibility Class',
        suggestedPattern: 'Extract Classes / Separate Concerns',
        impact: { maintainability: 70, testability: 60, scalability: 40, performance: 20, teamVelocity: 50 },
        refactoringEffort: 'medium',
        businessJustification: 'Reduces development velocity and increases bug risk',
        technicalDebt: 8
      },
      ocp_violation: {
        category: 'solid_violation',
        severity: 'medium',
        title: 'Open-Closed Principle Violation',
        description: 'Code requires modification for extension, violating OCP',
        principle: 'Open-Closed Principle',
        currentPattern: 'Switch/If-else for Type Checking',
        suggestedPattern: 'Polymorphism / Strategy Pattern',
        impact: { maintainability: 60, testability: 50, scalability: 70, performance: 10, teamVelocity: 40 },
        refactoringEffort: 'medium',
        businessJustification: 'Makes feature addition risky and time-consuming',
        technicalDebt: 6
      },
      lsp_violation: {
        category: 'solid_violation',
        severity: 'high',
        title: 'Liskov Substitution Principle Violation',
        description: 'Subclass breaks contract of parent class, violating LSP',
        principle: 'Liskov Substitution Principle',
        currentPattern: 'Broken Inheritance Hierarchy',
        suggestedPattern: 'Composition over Inheritance / Interface Redesign',
        impact: { maintainability: 80, testability: 70, scalability: 30, performance: 10, teamVelocity: 60 },
        refactoringEffort: 'high',
        businessJustification: 'Creates unexpected runtime behavior and bugs',
        technicalDebt: 12
      },
      isp_violation: {
        category: 'solid_violation',
        severity: 'medium',
        title: 'Interface Segregation Principle Violation',
        description: 'Interface forces clients to depend on methods they do not use',
        principle: 'Interface Segregation Principle',
        currentPattern: 'Fat Interface',
        suggestedPattern: 'Split into Focused Interfaces',
        impact: { maintainability: 50, testability: 60, scalability: 40, performance: 5, teamVelocity: 35 },
        refactoringEffort: 'medium',
        businessJustification: 'Increases coupling and testing complexity',
        technicalDebt: 5
      },
      dip_violation: {
        category: 'solid_violation',
        severity: 'high',
        title: 'Dependency Inversion Principle Violation',
        description: 'High-level modules depend on low-level modules, violating DIP',
        principle: 'Dependency Inversion Principle',
        currentPattern: 'Direct Dependency on Concretions',
        suggestedPattern: 'Dependency Injection / Abstract Dependencies',
        impact: { maintainability: 70, testability: 85, scalability: 60, performance: 15, teamVelocity: 55 },
        refactoringEffort: 'high',
        businessJustification: 'Makes code hard to test and change',
        technicalDebt: 10
      },
      high_coupling: {
        category: 'coupling',
        severity: 'medium',
        title: 'High Coupling Detected',
        description: 'Module has too many dependencies, indicating high coupling',
        principle: 'Low Coupling Principle',
        currentPattern: 'Highly Coupled Modules',
        suggestedPattern: 'Facade Pattern / Dependency Injection',
        impact: { maintainability: 60, testability: 70, scalability: 50, performance: 10, teamVelocity: 45 },
        refactoringEffort: 'medium',
        businessJustification: 'Makes changes risky and testing difficult',
        technicalDebt: 7
      },
      low_cohesion: {
        category: 'cohesion',
        severity: 'medium',
        title: 'Low Cohesion Detected',
        description: 'Module elements are not strongly related, indicating low cohesion',
        principle: 'High Cohesion Principle',
        currentPattern: 'Low Cohesion Module',
        suggestedPattern: 'Extract Related Functionality',
        impact: { maintainability: 55, testability: 45, scalability: 35, performance: 5, teamVelocity: 40 },
        refactoringEffort: 'medium',
        businessJustification: 'Reduces code readability and maintainability',
        technicalDebt: 6
      }
    };

    return issueInfoMap[violationType] || {
      category: 'maintainability',
      severity: 'medium',
      title: 'Architectural Issue',
      description: 'Architectural concern detected',
      principle: 'General Design Principle',
      currentPattern: 'Current Implementation',
      suggestedPattern: 'Improved Implementation',
      impact: { maintainability: 30, testability: 30, scalability: 30, performance: 10, teamVelocity: 25 },
      refactoringEffort: 'medium',
      businessJustification: 'Potential impact on code quality',
      technicalDebt: 4
    };
  }

  /**
   * Helper methods for parsing code structure
   */
  private findLineNumber(fileContent: string, match: string): number {
    const index = fileContent.indexOf(match);
    if (index === -1) {return 1;}
    
    return fileContent.substring(0, index).split('\n').length;
  }

  private countLines(text: string): number {
    return text.split('\n').length - 1;
  }

  private findClassContext(fileContent: string, match: string): string | undefined {
    const index = fileContent.indexOf(match);
    if (index === -1) {return undefined;}

    const beforeMatch = fileContent.substring(0, index);
    const classMatch = beforeMatch.match(/class\s+(\w+)/g);
    
    if (classMatch && classMatch.length > 0) {
      const lastClass = classMatch[classMatch.length - 1];
      const nameMatch = lastClass.match(/class\s+(\w+)/);
      return nameMatch ? nameMatch[1] : undefined;
    }

    return undefined;
  }

  private findFunctionContext(fileContent: string, match: string): string | undefined {
    const index = fileContent.indexOf(match);
    if (index === -1) {return undefined;}

    const beforeMatch = fileContent.substring(0, index);
    const functionMatch = beforeMatch.match(/(?:function\s+(\w+)|(\w+)\s*[:=]\s*(?:function|\(.*?\)\s*=>)|(\w+)\s*\([^)]*\)\s*\{)/g);
    
    if (functionMatch && functionMatch.length > 0) {
      const lastFunction = functionMatch[functionMatch.length - 1];
      const nameMatch = lastFunction.match(/(?:function\s+(\w+)|(\w+)\s*[:=]|(\w+)\s*\()/);
      return nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3]) : undefined;
    }

    return undefined;
  }

  private extractModuleName(filePath: string): string {
    const pathParts = filePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    return fileName.replace(/\.(ts|js|tsx|jsx)$/, '');
  }

  /**
   * Perform AI-powered architecture analysis
   */
  private async performAIArchitectureAnalysis(codeFiles: string[], userQuery: string): Promise<ArchitecturalIssue[]> {
    const task: AnalysisTask = {
      id: `architecture_analysis_${Date.now()}`,
      type: 'architecture',
      complexity: 'high',
      context: codeFiles,
      userQuery: `Perform comprehensive architectural analysis: ${userQuery}`,
      requirements: {
        accuracy: 0.9,
        speed: 0.5,
        cost: 0.7
      }
    };

    try {
      // Use consensus analysis for architectural assessment
      const consensus = await this.orchestrator.executeConsensusAnalysis(task, 2);
      
      // Parse AI response to extract architectural issues
      return this.parseAIArchitectureResponse(consensus.finalResponse);

    } catch (error) {
      this.logger.error('AI architecture analysis failed', { error });
      return [];
    }
  }

  /**
   * Parse AI response to extract architectural issues
   */
  private parseAIArchitectureResponse(aiResponse: string): ArchitecturalIssue[] {
    // Simplified parser - in practice, you'd implement more sophisticated parsing
    const issues: ArchitecturalIssue[] = [];
    
    // Look for architectural issues in the response
    const issueSections = aiResponse.split(/(?:architectural issue|design problem|violation|anti-pattern)/gi);
    
    for (let i = 1; i < issueSections.length; i++) {
      const section = issueSections[i];
      
      const issue: ArchitecturalIssue = {
        id: `ai_arch_${Date.now()}_${i}`,
        category: this.extractArchitecturalCategory(section),
        severity: this.extractSeverity(section),
        title: this.extractTitle(section),
        description: this.extractDescription(section),
        location: this.extractLocation(section),
        principle: this.extractPrinciple(section),
        currentPattern: this.extractCurrentPattern(section),
        suggestedPattern: this.extractSuggestedPattern(section),
        impact: this.extractImpact(section),
        refactoringEffort: this.extractRefactoringEffort(section),
        businessJustification: this.extractBusinessJustification(section),
        technicalDebt: this.extractTechnicalDebt(section)
      };

      issues.push(issue);
    }

    return issues;
  }

  /**
   * Helper methods for parsing AI response
   */
  private extractArchitecturalCategory(text: string): ArchitecturalIssue['category'] {
    const categoryMapping: Record<string, ArchitecturalIssue['category']> = {
      'solid': 'solid_violation',
      'coupling': 'coupling',
      'cohesion': 'cohesion',
      'dependency': 'dependency',
      'pattern': 'design_pattern',
      'scalability': 'scalability',
      'maintainability': 'maintainability',
      'testability': 'testability'
    };

    for (const [key, category] of Object.entries(categoryMapping)) {
      if (text.toLowerCase().includes(key)) {
        return category;
      }
    }

    return 'maintainability';
  }

  private extractSeverity(text: string): ArchitecturalIssue['severity'] {
    if (text.toLowerCase().includes('critical')) {return 'critical';}
    if (text.toLowerCase().includes('high')) {return 'high';}
    if (text.toLowerCase().includes('medium')) {return 'medium';}
    if (text.toLowerCase().includes('low')) {return 'low';}
    return 'medium';
  }

  private extractTitle(text: string): string {
    const titleMatch = text.match(/(?:title|name|issue):\s*([^\n]+)/i);
    return titleMatch ? titleMatch[1].trim() : 'Architectural Issue';
  }

  private extractDescription(text: string): string {
    const descMatch = text.match(/(?:description|detail):\s*([^\n]+)/i);
    return descMatch ? descMatch[1].trim() : 'Architectural issue detected by AI analysis';
  }

  private extractLocation(text: string): ArchitecturalIssue['location'] {
    const fileMatch = text.match(/(?:file|location):\s*([^\n\s]+)/i);
    const classMatch = text.match(/(?:class):\s*([^\n\s]+)/i);
    const funcMatch = text.match(/(?:function|method):\s*([^\n\s]+)/i);

    return {
      file: fileMatch ? fileMatch[1] : 'unknown',
      class: classMatch ? classMatch[1] : undefined,
      function: funcMatch ? funcMatch[1] : undefined
    };
  }

  private extractPrinciple(text: string): string {
    const principleMatch = text.match(/(?:principle|rule):\s*([^\n]+)/i);
    return principleMatch ? principleMatch[1].trim() : 'Design Principle';
  }

  private extractCurrentPattern(text: string): string {
    const currentMatch = text.match(/(?:current|existing):\s*([^\n]+)/i);
    return currentMatch ? currentMatch[1].trim() : 'Current Implementation';
  }

  private extractSuggestedPattern(text: string): string {
    const suggestedMatch = text.match(/(?:suggested|recommended|better):\s*([^\n]+)/i);
    return suggestedMatch ? suggestedMatch[1].trim() : 'Improved Implementation';
  }

  private extractImpact(text: string): ArchitecturalIssue['impact'] {
    // Simplified impact extraction
    return {
      maintainability: this.extractImpactScore(text, 'maintainability') || 50,
      testability: this.extractImpactScore(text, 'testability') || 40,
      scalability: this.extractImpactScore(text, 'scalability') || 30,
      performance: this.extractImpactScore(text, 'performance') || 20,
      teamVelocity: this.extractImpactScore(text, 'velocity') || 35
    };
  }

  private extractImpactScore(text: string, category: string): number | undefined {
    const scoreMatch = text.match(new RegExp(`${category}[^\\d]*(\\d+)`, 'i'));
    return scoreMatch ? parseInt(scoreMatch[1]) : undefined;
  }

  private extractRefactoringEffort(text: string): ArchitecturalIssue['refactoringEffort'] {
    if (text.toLowerCase().includes('very high')) {return 'very_high';}
    if (text.toLowerCase().includes('high')) {return 'high';}
    if (text.toLowerCase().includes('medium')) {return 'medium';}
    if (text.toLowerCase().includes('low')) {return 'low';}
    return 'medium';
  }

  private extractBusinessJustification(text: string): string {
    const justificationMatch = text.match(/(?:business|justification|impact):\s*([^\n]+)/i);
    return justificationMatch ? justificationMatch[1].trim() : 'Impacts development efficiency';
  }

  private extractTechnicalDebt(text: string): number {
    const debtMatch = text.match(/(?:debt|hours?):\s*(\d+)/i);
    return debtMatch ? parseInt(debtMatch[1]) : 5;
  }

  /**
   * Analyze dependencies for issues
   */
  private async analyzeDependencies(
    codeFiles: string[],
    projectMetadata?: { packageJson?: any; dependencies?: string[]; projectType?: string; }
  ): Promise<DependencyIssue[]> {
    const dependencyIssues: DependencyIssue[] = [];

    // Analyze circular dependencies
    const circularDeps = this.detectCircularDependencies(codeFiles);
    dependencyIssues.push(...circularDeps);

    // Analyze package.json dependencies if available
    if (projectMetadata?.packageJson) {
      const packageIssues = this.analyzePackageDependencies(projectMetadata.packageJson);
      dependencyIssues.push(...packageIssues);
    }

    return dependencyIssues;
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(codeFiles: string[]): DependencyIssue[] {
    const dependencies: Map<string, Set<string>> = new Map();
    const issues: DependencyIssue[] = [];

    // Build dependency graph
    for (const filePath of codeFiles) {
      const fileContent = filePath; // Assuming filePath contains content
      const imports = this.extractImports(fileContent);
      dependencies.set(filePath, new Set(imports));
    }

    // Detect cycles using DFS
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const detectCycle = (node: string, path: string[]): void => {
      if (visiting.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        const cycle = path.slice(cycleStart);
        
        issues.push({
          type: 'circular',
          source: cycle[0],
          target: cycle[cycle.length - 1],
          description: `Circular dependency detected: ${cycle.join(' -> ')}`,
          severity: 'high',
          recommendation: 'Refactor to remove circular dependency',
          alternatives: ['Extract common functionality', 'Use dependency injection']
        });
        return;
      }

      if (visited.has(node)) {return;}

      visiting.add(node);
      path.push(node);

      const deps = dependencies.get(node) || new Set();
      for (const dep of deps) {
        detectCycle(dep, [...path]);
      }

      visiting.delete(node);
      visited.add(node);
    };

    for (const node of dependencies.keys()) {
      if (!visited.has(node)) {
        detectCycle(node, []);
      }
    }

    return issues;
  }

  /**
   * Extract import statements from file content
   */
  private extractImports(fileContent: string): string[] {
    const imports: string[] = [];
    
    // ES6 imports
    const es6ImportRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = es6ImportRegex.exec(fileContent)) !== null) {
      imports.push(match[1]);
    }

    // CommonJS requires
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(fileContent)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Analyze package.json dependencies
   */
  private analyzePackageDependencies(packageJson: any): DependencyIssue[] {
    const issues: DependencyIssue[] = [];
    
    // Check for outdated dependencies (simplified)
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    for (const [name, version] of Object.entries(dependencies)) {
      // Simplified checks
      if (typeof version === 'string' && version.includes('^0.')) {
        issues.push({
          type: 'outdated',
          source: 'package.json',
          target: name,
          description: `Dependency ${name} is at pre-1.0 version (${version})`,
          severity: 'medium',
          recommendation: 'Consider upgrading to stable version',
          alternatives: [`Look for mature alternatives to ${name}`]
        });
      }
    }

    return issues;
  }

  /**
   * Calculate module metrics
   */
  private calculateModuleMetrics(codeFiles: string[]): ModuleMetrics[] {
    const metrics: ModuleMetrics[] = [];

    for (const filePath of codeFiles) {
      const fileContent = filePath; // Assuming filePath contains content
      const moduleName = this.extractModuleName(filePath);
      
      const metric: ModuleMetrics = {
        name: moduleName,
        linesOfCode: fileContent.split('\n').length,
        complexity: this.calculateCyclomaticComplexity(fileContent),
        coupling: this.calculateCouplingMetrics(fileContent, codeFiles),
        cohesion: this.calculateCohesionScore(fileContent),
        responsibilities: this.identifyResponsibilities(fileContent),
        violations: this.identifyViolations(fileContent)
      };

      metrics.push(metric);
    }

    return metrics;
  }

  /**
   * Calculate cyclomatic complexity
   */
  private calculateCyclomaticComplexity(fileContent: string): number {
    // Count decision points
    const decisionPoints = [
      /if\s*\(/g,
      /else\s+if\s*\(/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /case\s+/g,
      /catch\s*\(/g,
      /\?\s*.*?\s*:/g, // Ternary operator
      /&&/g,
      /\|\|/g
    ];

    let complexity = 1; // Base complexity

    for (const pattern of decisionPoints) {
      const matches = fileContent.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Calculate coupling metrics
   */
  private calculateCouplingMetrics(fileContent: string, allFiles: string[]): {
    afferent: number;
    efferent: number;
    instability: number;
  } {
    const imports = this.extractImports(fileContent);
    const efferent = imports.length;
    
    // Count how many files import this one (simplified)
    const afferent = allFiles.filter(file => {
      const otherImports = this.extractImports(file);
      return otherImports.some(imp => fileContent.includes(imp));
    }).length;

    const instability = efferent / (afferent + efferent + 1); // +1 to avoid division by zero

    return { afferent, efferent, instability };
  }

  /**
   * Calculate cohesion score
   */
  private calculateCohesionScore(fileContent: string): number {
    // Simplified cohesion calculation based on method interactions
    const methods = fileContent.match(/(?:function\s+\w+|^\s*\w+\s*\([^)]*\)\s*\{)/gm) || [];
    const methodCalls = fileContent.match(/this\.\w+\s*\(/g) || [];
    
    if (methods.length === 0) {return 0;}
    
    const cohesionRatio = methodCalls.length / methods.length;
    return Math.min(100, Math.round(cohesionRatio * 50)); // Scale to 0-100
  }

  /**
   * Identify module responsibilities
   */
  private identifyResponsibilities(fileContent: string): string[] {
    const responsibilities: string[] = [];
    
    // Look for key patterns that indicate responsibilities
    const patterns = [
      { pattern: /validate|check|verify/gi, responsibility: 'Validation' },
      { pattern: /save|store|persist|write/gi, responsibility: 'Data Persistence' },
      { pattern: /fetch|get|read|load/gi, responsibility: 'Data Retrieval' },
      { pattern: /send|email|notify|alert/gi, responsibility: 'Communication' },
      { pattern: /calculate|compute|process/gi, responsibility: 'Business Logic' },
      { pattern: /render|display|show|format/gi, responsibility: 'Presentation' },
      { pattern: /log|audit|track|monitor/gi, responsibility: 'Logging/Monitoring' },
      { pattern: /auth|login|permission|access/gi, responsibility: 'Authentication/Authorization' }
    ];

    for (const { pattern, responsibility } of patterns) {
      if (pattern.test(fileContent)) {
        responsibilities.push(responsibility);
      }
    }

    return [...new Set(responsibilities)]; // Remove duplicates
  }

  /**
   * Identify SOLID violations
   */
  private identifyViolations(fileContent: string): string[] {
    const violations: string[] = [];
    
    for (const [violationType] of this.solidViolationPatterns) {
      const patterns = this.solidViolationPatterns.get(violationType)!;
      for (const pattern of patterns) {
        if (pattern.test(fileContent)) {
          violations.push(violationType.replace('_', ' ').toUpperCase());
          break; // One violation per type
        }
      }
    }

    return violations;
  }

  /**
   * Recognize architectural patterns
   */
  private recognizeArchitecturalPatterns(codeFiles: string[]): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];
    
    for (const [patternName, regexes] of this.architecturalPatterns) {
      const matches = codeFiles.some(file => 
        regexes.some(regex => regex.test(file))
      );

      if (matches) {
        const pattern = this.createArchitecturalPattern(patternName, codeFiles);
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Create architectural pattern assessment
   */
  private createArchitecturalPattern(patternName: string, codeFiles: string[]): ArchitecturalPattern {
    const patternInfo: Record<string, any> = {
      singleton: {
        description: 'Ensures a class has only one instance and provides global access',
        benefits: ['Controlled access to sole instance', 'Reduced memory footprint'],
        drawbacks: ['Difficult to test', 'Hidden dependencies', 'Violates SRP'],
        recommendations: ['Consider dependency injection', 'Use sparingly']
      },
      factory: {
        description: 'Creates objects without specifying exact classes',
        benefits: ['Loose coupling', 'Easy to extend', 'Centralized object creation'],
        drawbacks: ['Added complexity', 'Indirection'],
        recommendations: ['Good for object creation logic', 'Use when you need flexibility']
      },
      observer: {
        description: 'Defines one-to-many dependency between objects',
        benefits: ['Loose coupling', 'Dynamic relationships', 'Open/closed principle'],
        drawbacks: ['Memory leaks if not cleaned', 'Debugging complexity'],
        recommendations: ['Remember to unsubscribe', 'Use weak references when possible']
      }
    };

    const info = patternInfo[patternName] || {
      description: 'Architectural pattern detected',
      benefits: ['Structured approach'],
      drawbacks: ['Potential complexity'],
      recommendations: ['Review implementation']
    };

    // Calculate implementation quality (simplified)
    const qualityScore = this.assessPatternImplementationQuality(patternName, codeFiles);

    return {
      name: patternName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: info.description,
      isImplemented: true,
      implementationQuality: qualityScore,
      benefits: info.benefits,
      drawbacks: info.drawbacks,
      recommendations: info.recommendations
    };
  }

  /**
   * Assess pattern implementation quality
   */
  private assessPatternImplementationQuality(patternName: string, codeFiles: string[]): number {
    // Simplified quality assessment
    let score = 70; // Base score

    const allContent = codeFiles.join('\n');
    
    // Check for common issues
    if (patternName === 'singleton' && allContent.includes('new ')) {
      score -= 20; // Direct instantiation found
    }

    if (patternName === 'observer' && !allContent.includes('removeEventListener')) {
      score -= 15; // Missing cleanup
    }

    if (patternName === 'factory' && allContent.includes('switch') && allContent.includes('case')) {
      score += 10; // Good factory implementation
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Assess SOLID principles compliance
   */
  private assessSolidPrinciples(codeFiles: string[]): ArchitectureAssessment['principles'] {
    const allContent = codeFiles.join('\n');
    
    return {
      singleResponsibility: this.assessSRPCompliance(allContent),
      openClosed: this.assessOCPCompliance(allContent),
      liskovSubstitution: this.assessLSPCompliance(allContent),
      interfaceSegregation: this.assessISPCompliance(allContent),
      dependencyInversion: this.assessDIPCompliance(allContent)
    };
  }

  /**
   * SOLID principles assessment methods
   */
  private assessSRPCompliance(content: string): number {
    const violations = this.solidViolationPatterns.get('srp_violation')!
      .reduce((count, pattern) => count + (content.match(pattern) || []).length, 0);
    
    const classes = (content.match(/class\s+\w+/g) || []).length;
    if (classes === 0) {return 80;} // No classes to violate SRP
    
    const violationRatio = violations / classes;
    return Math.max(0, Math.round(100 - (violationRatio * 50)));
  }

  private assessOCPCompliance(content: string): number {
    const violations = this.solidViolationPatterns.get('ocp_violation')!
      .reduce((count, pattern) => count + (content.match(pattern) || []).length, 0);
    
    return Math.max(0, 100 - (violations * 10));
  }

  private assessLSPCompliance(content: string): number {
    const violations = this.solidViolationPatterns.get('lsp_violation')!
      .reduce((count, pattern) => count + (content.match(pattern) || []).length, 0);
    
    return Math.max(0, 100 - (violations * 15));
  }

  private assessISPCompliance(content: string): number {
    const violations = this.solidViolationPatterns.get('isp_violation')!
      .reduce((count, pattern) => count + (content.match(pattern) || []).length, 0);
    
    return Math.max(0, 100 - (violations * 12));
  }

  private assessDIPCompliance(content: string): number {
    const violations = this.solidViolationPatterns.get('dip_violation')!
      .reduce((count, pattern) => count + (content.match(pattern) || []).length, 0);
    
    return Math.max(0, 100 - (violations * 8));
  }

  /**
   * Evaluate quality attributes
   */
  private evaluateQualityAttributes(
    patternIssues: ArchitecturalIssue[],
    aiIssues: ArchitecturalIssue[],
    moduleMetrics: ModuleMetrics[]
  ): ArchitectureAssessment['qualityAttributes'] {
    const allIssues = [...patternIssues, ...aiIssues];
    
    // Calculate average impact scores
    const avgImpact = allIssues.reduce((acc, issue) => ({
      maintainability: acc.maintainability + issue.impact.maintainability,
      testability: acc.testability + issue.impact.testability,
      scalability: acc.scalability + issue.impact.scalability,
      performance: acc.performance + issue.impact.performance
    }), { maintainability: 0, testability: 0, scalability: 0, performance: 0 });

    const issueCount = allIssues.length || 1;
    
    // Calculate complexity penalty
    const avgComplexity = moduleMetrics.reduce((sum, m) => sum + m.complexity, 0) / (moduleMetrics.length || 1);
    const complexityPenalty = Math.min(30, avgComplexity - 10); // Penalty for complexity > 10

    return {
      maintainability: Math.max(0, 100 - (avgImpact.maintainability / issueCount) - complexityPenalty),
      testability: Math.max(0, 100 - (avgImpact.testability / issueCount) - complexityPenalty),
      scalability: Math.max(0, 100 - (avgImpact.scalability / issueCount)),
      performance: Math.max(0, 100 - (avgImpact.performance / issueCount)),
      security: 80, // Simplified - would integrate with security analysis
      usability: 75  // Simplified - would require UI/UX analysis
    };
  }

  /**
   * Calculate technical debt
   */
  private calculateTechnicalDebt(issues: ArchitecturalIssue[]): ArchitectureAssessment['technicalDebt'] {
    const totalHours = issues.reduce((sum, issue) => sum + issue.technicalDebt, 0);
    
    const priority = issues.reduce((acc, issue) => {
      switch (issue.severity) {
        case 'critical': acc.immediate += issue.technicalDebt; break;
        case 'high': acc.high += issue.technicalDebt; break;
        case 'medium': acc.medium += issue.technicalDebt; break;
        case 'low': acc.low += issue.technicalDebt; break;
      }
      return acc;
    }, { immediate: 0, high: 0, medium: 0, low: 0 });

    return { totalHours, priority };
  }

  /**
   * Generate architecture recommendations
   */
  private async generateArchitectureRecommendations(
    issues: ArchitecturalIssue[],
    dependencyIssues: DependencyIssue[],
    moduleMetrics: ModuleMetrics[],
    patterns: ArchitecturalPattern[]
  ): Promise<ArchitectureAssessment['recommendations']> {
    const recommendations = {
      immediate: [] as string[],
      shortTerm: [] as string[],
      longTerm: [] as string[],
      strategic: [] as string[]
    };

    // Immediate recommendations (critical issues)
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.immediate.push('Address critical architectural violations immediately');
      criticalIssues.forEach(issue => {
        recommendations.immediate.push(`Fix ${issue.title} in ${issue.location.file}`);
      });
    }

    // Short-term recommendations (high priority issues)
    const highIssues = issues.filter(i => i.severity === 'high');
    if (highIssues.length > 0) {
      recommendations.shortTerm.push('Refactor high-priority architectural issues');
      recommendations.shortTerm.push('Implement dependency injection to reduce coupling');
    }

    // Long-term recommendations (medium and low priority)
    if (moduleMetrics.some(m => m.complexity > 15)) {
      recommendations.longTerm.push('Break down complex modules into smaller, focused components');
    }

    if (dependencyIssues.some(d => d.type === 'circular')) {
      recommendations.longTerm.push('Redesign architecture to eliminate circular dependencies');
    }

    // Strategic recommendations
    const avgCoupling = moduleMetrics.reduce((sum, m) => sum + m.coupling.efferent, 0) / moduleMetrics.length;
    if (avgCoupling > 10) {
      recommendations.strategic.push('Consider microservices architecture to reduce coupling');
    }

    if (patterns.filter(p => p.implementationQuality < 70).length > 0) {
      recommendations.strategic.push('Improve design pattern implementations');
    }

    recommendations.strategic.push('Establish architectural guidelines and review processes');
    recommendations.strategic.push('Implement automated architecture compliance checks');

    return recommendations;
  }

  /**
   * Generate final architecture assessment
   */
  private generateArchitectureAssessment(
    issues: ArchitecturalIssue[],
    dependencyIssues: DependencyIssue[],
    moduleMetrics: ModuleMetrics[],
    patterns: ArchitecturalPattern[],
    principles: ArchitectureAssessment['principles'],
    qualityAttributes: ArchitectureAssessment['qualityAttributes'],
    technicalDebt: ArchitectureAssessment['technicalDebt'],
    recommendations: ArchitectureAssessment['recommendations']
  ): ArchitectureAssessment {
    // Calculate overall score
    const issueScore = this.calculateArchitecturalIssueScore(issues);
    const principleScore = Object.values(principles).reduce((sum, score) => sum + score, 0) / 5;
    const qualityScore = Object.values(qualityAttributes).reduce((sum, score) => sum + score, 0) / 6;
    const patternScore = patterns.reduce((sum, p) => sum + p.implementationQuality, 0) / (patterns.length || 1);
    
    const overallScore = Math.round(
      (issueScore * 0.3) + 
      (principleScore * 0.25) + 
      (qualityScore * 0.25) + 
      (patternScore * 0.2)
    );

    // Determine architectural grade
    const architecturalGrade = overallScore >= 90 ? 'A' :
                              overallScore >= 80 ? 'B' :
                              overallScore >= 70 ? 'C' :
                              overallScore >= 60 ? 'D' : 'F';

    return {
      overallScore,
      architecturalGrade,
      issues,
      dependencyIssues,
      moduleMetrics,
      patterns,
      principles,
      qualityAttributes,
      technicalDebt,
      recommendations
    };
  }

  /**
   * Calculate architectural issue score
   */
  private calculateArchitecturalIssueScore(issues: ArchitecturalIssue[]): number {
    if (issues.length === 0) {return 100;}

    const weights = { critical: 25, high: 15, medium: 8, low: 3 };
    const totalWeight = issues.reduce((sum, issue) => sum + weights[issue.severity], 0);
    
    return Math.max(0, 100 - Math.min(100, totalWeight));
  }

  /**
   * Cleanup and dispose resources
   */
  public dispose(): void {
    this.removeAllListeners();
    this.logger.info('ArchitectureAnalysisAgent disposed');
  }
}

export type { ArchitecturalIssue, DependencyIssue, ModuleMetrics, ArchitecturalPattern, ArchitectureAssessment };