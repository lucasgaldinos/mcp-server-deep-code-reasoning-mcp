/**
 * Performance Analysis Agent
 * Specialized AI agent for performance optimization and bottleneck detection
 * 
 * Features:
 * - Performance bottleneck identification
 * - Memory leak detection
 * - CPU usage optimization
 * - Database query analysis
 * - Caching strategy recommendations
 * - Scalability assessment
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger.js';
import { MultiModelOrchestrator, AnalysisTask } from './multi-model-orchestrator.js';

interface PerformanceIssue {
  id: string;
  type: 'cpu_intensive' | 'memory_leak' | 'io_blocking' | 'database_slow' | 'inefficient_algorithm' | 'resource_contention' | 'scalability_limit';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location: {
    file: string;
    line?: number;
    function?: string;
    component?: string;
  };
  metrics: {
    currentPerformance?: number; // Current execution time/resource usage
    expectedPerformance?: number; // Expected optimal performance
    improvementPotential?: number; // Potential improvement percentage
    impactScope?: 'local' | 'module' | 'system' | 'global';
  };
  evidence: string[];
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  estimatedEffort: 'low' | 'medium' | 'high';
  businessImpact: string;
}

interface PerformanceProfile {
  executionTime: {
    total: number;
    breakdown: Record<string, number>;
  };
  memoryUsage: {
    peak: number;
    average: number;
    leaks: string[];
  };
  cpuUtilization: {
    average: number;
    peaks: number[];
    hotSpots: string[];
  };
  ioOperations: {
    fileSystem: number;
    network: number;
    database: number;
  };
  cachingEfficiency: {
    hitRate: number;
    missRate: number;
    opportunities: string[];
  };
}

interface OptimizationStrategy {
  priority: 'immediate' | 'high' | 'medium' | 'low';
  category: 'algorithm' | 'caching' | 'database' | 'infrastructure' | 'architecture';
  strategy: string;
  expectedGains: {
    performance: number; // Percentage improvement
    cost: number; // Cost reduction percentage
    scalability: number; // Scalability improvement
  };
  implementation: {
    complexity: 'low' | 'medium' | 'high';
    timeEstimate: string;
    dependencies: string[];
    risks: string[];
  };
}

interface PerformanceAssessment {
  overallScore: number; // 0-100 performance score
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: PerformanceIssue[];
  profile: PerformanceProfile;
  optimizationStrategies: OptimizationStrategy[];
  scalabilityAnalysis: {
    currentCapacity: string;
    bottlenecks: string[];
    scalingRecommendations: string[];
  };
  benchmarkComparison: {
    industry: string;
    competitors: string;
    improvement: string;
  };
}

export class PerformanceAnalysisAgent extends EventEmitter {
  private readonly logger: Logger;
  private readonly orchestrator: MultiModelOrchestrator;
  private readonly performancePatterns: Map<string, RegExp[]> = new Map();
  private readonly benchmarkData: Map<string, number> = new Map();

  constructor(orchestrator: MultiModelOrchestrator) {
    super();
    this.logger = new Logger('PerformanceAnalysisAgent');
    this.orchestrator = orchestrator;
    
    this.initializePerformancePatterns();
    this.initializeBenchmarkData();
    this.setupEventHandlers();
  }

  /**
   * Initialize performance anti-patterns and optimization patterns
   */
  private initializePerformancePatterns(): void {
    // CPU-intensive patterns
    this.performancePatterns.set('cpu_intensive', [
      /for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)\s*\{[^}]*for/gi, // Nested loops
      /while\s*\([^)]*\)\s*\{[^}]*while\s*\([^)]*\)\s*\{/gi, // Nested while loops
      /\.sort\(\)\s*\.sort\(\)/gi, // Multiple sorts
      /JSON\.parse\s*\(\s*JSON\.stringify/gi, // Inefficient object cloning
      /Math\.pow|Math\.sqrt|Math\.sin|Math\.cos/gi, // Heavy math operations in loops
    ]);

    // Memory leak patterns
    this.performancePatterns.set('memory_leak', [
      /setInterval\s*\([^}]+\}[^;]*(?!clearInterval)/gi, // Uncleaned intervals
      /setTimeout\s*\([^}]+\}[^;]*(?!clearTimeout)/gi, // Uncleaned timeouts
      /addEventListener\s*\([^}]+\}[^;]*(?!removeEventListener)/gi, // Uncleaned listeners
      /new\s+\w+\([^)]*\)[^;]*(?!\.dispose|\.destroy|\.cleanup)/gi, // Undisposed objects
      /global\.|window\.|globalThis\./gi, // Global variable assignments
    ]);

    // I/O blocking patterns
    this.performancePatterns.set('io_blocking', [
      /fs\.readFileSync|fs\.writeFileSync/gi, // Synchronous file operations
      /await\s+(?!Promise\.all|Promise\.allSettled)/gi, // Sequential awaits
      /\.then\s*\([^}]+\}\s*\)\s*\.then/gi, // Promise chaining instead of Promise.all
      /XMLHttpRequest|fetch(?!\(\[)/gi, // Potential sequential HTTP requests
    ]);

    // Database performance patterns
    this.performancePatterns.set('database_slow', [
      /SELECT\s+\*\s+FROM/gi, // SELECT * queries
      /for\s*\([^)]*\)\s*\{[^}]*(?:INSERT|UPDATE|DELETE)/gi, // Queries in loops
      /WHERE.*?\+.*?['"]/gi, // String concatenation in WHERE clauses
      /(?:LIKE|ILIKE)\s+['"]%.*%['"]/gi, // Leading wildcard searches
      /(?<!INDEX|KEY)\s+ON\s+\w+\s*\([^)]*(?:TEXT|VARCHAR\(\d{3,}\))/gi, // Large string columns without indexes
    ]);

    // Inefficient algorithm patterns
    this.performancePatterns.set('inefficient_algorithm', [
      /indexOf\s*\([^)]*\)\s*>\s*-1/gi, // indexOf instead of includes
      /\.filter\s*\([^}]+\}\s*\)\s*\.map/gi, // filter + map instead of reduce
      /\.map\s*\([^}]+\}\s*\)\s*\.filter/gi, // map + filter inefficiency
      /for\s*\([^)]*\)\s*\{[^}]*array\[.*?\]\s*=/gi, // Direct array manipulation in loops
      /Object\.keys\s*\([^)]*\)\s*\.forEach/gi, // Object.keys + forEach instead of for...in
    ]);

    // Resource contention patterns
    this.performancePatterns.set('resource_contention', [
      /Promise\.all\s*\(\s*\[[^\]]*(?:database|db|sql)[^\]]*\]\s*\)/gi, // Concurrent DB operations
      /(?:fs\.|file)[^;]*(?:write|read)[^;]*(?:fs\.|file)[^;]*(?:write|read)/gi, // Concurrent file operations
      /setInterval.*?setInterval/gi, // Multiple intervals
      /Worker.*?Worker/gi, // Multiple workers without coordination
    ]);

    this.logger.info('Performance patterns initialized', {
      patterns: Array.from(this.performancePatterns.keys()),
      totalPatterns: Array.from(this.performancePatterns.values()).reduce((sum, patterns) => sum + patterns.length, 0)
    });
  }

  /**
   * Initialize benchmark data for comparison
   */
  private initializeBenchmarkData(): void {
    // Response time benchmarks (in milliseconds)
    this.benchmarkData.set('api_response_excellent', 100);
    this.benchmarkData.set('api_response_good', 300);
    this.benchmarkData.set('api_response_acceptable', 1000);
    this.benchmarkData.set('api_response_poor', 3000);

    // Memory usage benchmarks (in MB)
    this.benchmarkData.set('memory_usage_excellent', 50);
    this.benchmarkData.set('memory_usage_good', 100);
    this.benchmarkData.set('memory_usage_acceptable', 250);
    this.benchmarkData.set('memory_usage_poor', 500);

    // CPU utilization benchmarks (percentage)
    this.benchmarkData.set('cpu_utilization_excellent', 20);
    this.benchmarkData.set('cpu_utilization_good', 50);
    this.benchmarkData.set('cpu_utilization_acceptable', 75);
    this.benchmarkData.set('cpu_utilization_poor', 90);

    // Database query benchmarks (milliseconds)
    this.benchmarkData.set('db_query_excellent', 10);
    this.benchmarkData.set('db_query_good', 50);
    this.benchmarkData.set('db_query_acceptable', 200);
    this.benchmarkData.set('db_query_poor', 1000);

    this.logger.info('Benchmark data initialized', {
      benchmarks: this.benchmarkData.size
    });
  }

  /**
   * Setup event handlers for performance monitoring
   */
  private setupEventHandlers(): void {
    this.orchestrator.on('model:execution:complete', (result) => {
      this.emit('performance:analysis:model:complete', result);
    });

    this.orchestrator.on('consensus:complete', (consensus) => {
      this.emit('performance:analysis:consensus', consensus);
    });
  }

  /**
   * Perform comprehensive performance analysis
   */
  public async performPerformanceAnalysis(
    codeFiles: string[], 
    userQuery: string,
    runtimeMetrics?: Partial<PerformanceProfile>
  ): Promise<PerformanceAssessment> {
    this.logger.info('Starting comprehensive performance analysis', {
      fileCount: codeFiles.length,
      query: userQuery,
      hasRuntimeMetrics: !!runtimeMetrics
    });

    const analysisStart = Date.now();

    try {
      // Step 1: Pattern-based performance issue detection
      const patternIssues = await this.detectPatternPerformanceIssues(codeFiles);

      // Step 2: AI-powered deep performance analysis
      const aiIssues = await this.performAIPerformanceAnalysis(codeFiles, userQuery);

      // Step 3: Combine and prioritize issues
      const allIssues = this.combinePerformanceIssues(patternIssues, aiIssues);

      // Step 4: Create performance profile
      const profile = this.createPerformanceProfile(codeFiles, runtimeMetrics);

      // Step 5: Generate optimization strategies
      const optimizationStrategies = await this.generateOptimizationStrategies(allIssues, profile);

      // Step 6: Perform scalability analysis
      const scalabilityAnalysis = await this.performScalabilityAnalysis(codeFiles, allIssues);

      // Step 7: Generate benchmark comparison
      const benchmarkComparison = this.generateBenchmarkComparison(profile);

      // Step 8: Create final assessment
      const assessment = this.generatePerformanceAssessment(
        allIssues,
        profile,
        optimizationStrategies,
        scalabilityAnalysis,
        benchmarkComparison
      );

      const duration = Date.now() - analysisStart;
      this.logger.info('Performance analysis completed', {
        duration: `${duration}ms`,
        issues: allIssues.length,
        overallScore: assessment.overallScore,
        grade: assessment.performanceGrade
      });

      this.emit('performance:analysis:complete', {
        assessment,
        duration,
        issueCount: allIssues.length
      });

      return assessment;

    } catch (error) {
      this.logger.error('Performance analysis failed', { error, duration: Date.now() - analysisStart });
      this.emit('performance:analysis:error', error);
      throw error;
    }
  }

  /**
   * Detect performance issues using pattern matching
   */
  private async detectPatternPerformanceIssues(codeFiles: string[]): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];

    for (const filePath of codeFiles) {
      try {
        const fileContent = filePath; // Assuming filePath contains content for now

        for (const [issueType, patterns] of this.performancePatterns) {
          for (const pattern of patterns) {
            const matches = fileContent.match(pattern);
            if (matches) {
              for (const match of matches) {
                const issue = this.createPerformanceIssueFromPattern(
                  issueType,
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
        this.logger.warn('Failed to analyze file for performance patterns', { file: filePath, error });
      }
    }

    this.logger.info('Pattern-based performance issue detection completed', {
      issues: issues.length
    });

    return issues;
  }

  /**
   * Create performance issue from pattern match
   */
  private createPerformanceIssueFromPattern(
    issueType: string,
    match: string,
    filePath: string,
    fileContent: string
  ): PerformanceIssue {
    const lineNumber = this.findLineNumber(fileContent, match);
    const functionContext = this.findFunctionContext(fileContent, match);
    
    const issueInfo = this.getPerformanceIssueInfo(issueType);
    
    return {
      id: `pattern_${issueType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: issueInfo.type,
      severity: issueInfo.severity,
      title: issueInfo.title,
      description: `${issueInfo.description} Found pattern: "${match.substring(0, 100)}..."`,
      location: {
        file: filePath,
        line: lineNumber,
        function: functionContext,
        component: this.extractComponentName(filePath)
      },
      metrics: {
        impactScope: issueInfo.impactScope,
        improvementPotential: issueInfo.improvementPotential
      },
      evidence: [match],
      recommendations: issueInfo.recommendations,
      estimatedEffort: issueInfo.estimatedEffort,
      businessImpact: issueInfo.businessImpact
    };
  }

  /**
   * Get performance issue information by type
   */
  private getPerformanceIssueInfo(issueType: string): {
    type: PerformanceIssue['type'];
    severity: PerformanceIssue['severity'];
    title: string;
    description: string;
    recommendations: PerformanceIssue['recommendations'];
    estimatedEffort: PerformanceIssue['estimatedEffort'];
    businessImpact: string;
    impactScope: PerformanceIssue['metrics']['impactScope'];
    improvementPotential: number;
  } {
    const issueInfoMap: Record<string, any> = {
      cpu_intensive: {
        type: 'cpu_intensive',
        severity: 'high',
        title: 'CPU-Intensive Operation',
        description: 'High CPU usage operation detected that may impact performance',
        recommendations: {
          immediate: ['Profile CPU usage', 'Optimize algorithmic complexity'],
          shortTerm: ['Implement caching', 'Add performance monitoring'],
          longTerm: ['Consider asynchronous processing', 'Implement load balancing']
        },
        estimatedEffort: 'medium',
        businessImpact: 'Response time degradation under high load',
        impactScope: 'module',
        improvementPotential: 40
      },
      memory_leak: {
        type: 'memory_leak',
        severity: 'critical',
        title: 'Potential Memory Leak',
        description: 'Code pattern that may cause memory leaks',
        recommendations: {
          immediate: ['Review resource cleanup', 'Add proper disposal'],
          shortTerm: ['Implement memory monitoring', 'Add automated cleanup'],
          longTerm: ['Redesign resource management', 'Implement garbage collection optimization']
        },
        estimatedEffort: 'high',
        businessImpact: 'System instability and potential crashes',
        impactScope: 'system',
        improvementPotential: 60
      },
      io_blocking: {
        type: 'io_blocking',
        severity: 'medium',
        title: 'I/O Blocking Operation',
        description: 'Synchronous I/O operation that blocks execution',
        recommendations: {
          immediate: ['Convert to asynchronous operation', 'Add timeout handling'],
          shortTerm: ['Implement connection pooling', 'Add retry logic'],
          longTerm: ['Consider streaming for large operations', 'Implement caching layer']
        },
        estimatedEffort: 'medium',
        businessImpact: 'Poor user experience during I/O operations',
        impactScope: 'local',
        improvementPotential: 35
      },
      database_slow: {
        type: 'database_slow',
        severity: 'high',
        title: 'Inefficient Database Operation',
        description: 'Database query or operation that may perform poorly',
        recommendations: {
          immediate: ['Add database indexes', 'Optimize query structure'],
          shortTerm: ['Implement query caching', 'Add database monitoring'],
          longTerm: ['Consider database sharding', 'Implement read replicas']
        },
        estimatedEffort: 'medium',
        businessImpact: 'Slow data retrieval affecting user experience',
        impactScope: 'system',
        improvementPotential: 50
      },
      inefficient_algorithm: {
        type: 'inefficient_algorithm',
        severity: 'medium',
        title: 'Inefficient Algorithm',
        description: 'Algorithm or data structure usage that could be optimized',
        recommendations: {
          immediate: ['Replace with more efficient algorithm', 'Optimize data structures'],
          shortTerm: ['Add algorithmic complexity testing', 'Implement benchmarking'],
          longTerm: ['Consider alternative approaches', 'Implement lazy loading']
        },
        estimatedEffort: 'low',
        businessImpact: 'Gradual performance degradation with scale',
        impactScope: 'local',
        improvementPotential: 25
      },
      resource_contention: {
        type: 'resource_contention',
        severity: 'high',
        title: 'Resource Contention',
        description: 'Multiple operations competing for the same resources',
        recommendations: {
          immediate: ['Implement resource locking', 'Add queue management'],
          shortTerm: ['Implement connection pooling', 'Add rate limiting'],
          longTerm: ['Consider microservices architecture', 'Implement distributed caching']
        },
        estimatedEffort: 'high',
        businessImpact: 'Unpredictable performance under concurrent load',
        impactScope: 'system',
        improvementPotential: 45
      }
    };

    return issueInfoMap[issueType] || {
      type: 'inefficient_algorithm',
      severity: 'medium',
      title: 'Performance Issue',
      description: 'Performance concern detected',
      recommendations: {
        immediate: ['Review and optimize'],
        shortTerm: ['Add monitoring'],
        longTerm: ['Consider refactoring']
      },
      estimatedEffort: 'medium',
      businessImpact: 'Potential performance impact',
      impactScope: 'local',
      improvementPotential: 20
    };
  }

  /**
   * Extract component name from file path
   */
  private extractComponentName(filePath: string): string {
    const pathParts = filePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    return fileName.replace(/\.(ts|js|tsx|jsx)$/, '');
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
    const functionMatch = beforeMatch.match(/(?:function\s+(\w+)|(\w+)\s*[:=]\s*(?:function|\(.*?\)\s*=>)|class\s+(\w+)|(\w+)\s*\([^)]*\)\s*\{)/g);
    
    if (functionMatch && functionMatch.length > 0) {
      const lastFunction = functionMatch[functionMatch.length - 1];
      const nameMatch = lastFunction.match(/(?:function\s+(\w+)|(\w+)\s*[:=]|class\s+(\w+)|(\w+)\s*\()/);
      return nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4]) : undefined;
    }

    return undefined;
  }

  /**
   * Perform AI-powered performance analysis
   */
  private async performAIPerformanceAnalysis(codeFiles: string[], userQuery: string): Promise<PerformanceIssue[]> {
    const task: AnalysisTask = {
      id: `performance_analysis_${Date.now()}`,
      type: 'performance',
      complexity: 'high',
      context: codeFiles,
      userQuery: `Perform comprehensive performance analysis: ${userQuery}`,
      requirements: {
        accuracy: 0.85,
        speed: 0.7,
        cost: 0.6
      }
    };

    try {
      // Use consensus analysis for better performance assessment
      const consensus = await this.orchestrator.executeConsensusAnalysis(task, 2);
      
      // Parse AI response to extract performance issues
      return this.parseAIPerformanceResponse(consensus.finalResponse);

    } catch (error) {
      this.logger.error('AI performance analysis failed', { error });
      return [];
    }
  }

  /**
   * Parse AI response to extract performance issues
   */
  private parseAIPerformanceResponse(aiResponse: string): PerformanceIssue[] {
    // Simplified parser - in practice, you'd implement more sophisticated parsing
    const issues: PerformanceIssue[] = [];
    
    // Look for performance issues in the response
    const issueSections = aiResponse.split(/(?:performance issue|bottleneck|optimization|slow)/gi);
    
    for (let i = 1; i < issueSections.length; i++) {
      const section = issueSections[i];
      
      const issue: PerformanceIssue = {
        id: `ai_perf_${Date.now()}_${i}`,
        type: this.extractPerformanceType(section),
        severity: this.extractSeverity(section),
        title: this.extractTitle(section),
        description: this.extractDescription(section),
        location: this.extractLocation(section),
        metrics: {
          impactScope: this.extractImpactScope(section),
          improvementPotential: this.extractImprovementPotential(section)
        },
        evidence: this.extractEvidence(section),
        recommendations: this.extractRecommendations(section),
        estimatedEffort: this.extractEffort(section),
        businessImpact: this.extractBusinessImpact(section)
      };

      issues.push(issue);
    }

    return issues;
  }

  /**
   * Helper methods for parsing AI response
   */
  private extractPerformanceType(text: string): PerformanceIssue['type'] {
    const typeMapping: Record<string, PerformanceIssue['type']> = {
      'cpu': 'cpu_intensive',
      'memory': 'memory_leak',
      'io': 'io_blocking',
      'database': 'database_slow',
      'algorithm': 'inefficient_algorithm',
      'resource': 'resource_contention'
    };

    for (const [key, type] of Object.entries(typeMapping)) {
      if (text.toLowerCase().includes(key)) {
        return type;
      }
    }

    return 'inefficient_algorithm';
  }

  private extractSeverity(text: string): PerformanceIssue['severity'] {
    if (text.toLowerCase().includes('critical')) {return 'critical';}
    if (text.toLowerCase().includes('high')) {return 'high';}
    if (text.toLowerCase().includes('medium')) {return 'medium';}
    if (text.toLowerCase().includes('low')) {return 'low';}
    return 'medium';
  }

  private extractTitle(text: string): string {
    const titleMatch = text.match(/(?:title|name|issue):\s*([^\n]+)/i);
    return titleMatch ? titleMatch[1].trim() : 'Performance Issue';
  }

  private extractDescription(text: string): string {
    const descMatch = text.match(/(?:description|detail):\s*([^\n]+)/i);
    return descMatch ? descMatch[1].trim() : 'Performance issue detected by AI analysis';
  }

  private extractLocation(text: string): PerformanceIssue['location'] {
    const fileMatch = text.match(/(?:file|location):\s*([^\n\s]+)/i);
    const lineMatch = text.match(/(?:line|row):\s*(\d+)/i);
    const funcMatch = text.match(/(?:function|method):\s*([^\n\s]+)/i);

    return {
      file: fileMatch ? fileMatch[1] : 'unknown',
      line: lineMatch ? parseInt(lineMatch[1]) : undefined,
      function: funcMatch ? funcMatch[1] : undefined
    };
  }

  private extractImpactScope(text: string): PerformanceIssue['metrics']['impactScope'] {
    if (text.toLowerCase().includes('global')) {return 'global';}
    if (text.toLowerCase().includes('system')) {return 'system';}
    if (text.toLowerCase().includes('module')) {return 'module';}
    return 'local';
  }

  private extractImprovementPotential(text: string): number {
    const percentMatch = text.match(/(\d+)%\s*(?:improvement|better|faster)/i);
    if (percentMatch) {return parseInt(percentMatch[1]);}
    
    // Default estimates based on keywords
    if (text.toLowerCase().includes('significant')) {return 40;}
    if (text.toLowerCase().includes('moderate')) {return 25;}
    if (text.toLowerCase().includes('minor')) {return 10;}
    
    return 20; // Default
  }

  private extractEvidence(text: string): string[] {
    const evidenceMatch = text.match(/(?:evidence|code|example):\s*([^\n]+)/gi);
    return evidenceMatch ? evidenceMatch.map(e => e.split(':')[1].trim()) : [];
  }

  private extractRecommendations(text: string): PerformanceIssue['recommendations'] {
    const immediateMatch = text.match(/(?:immediate|urgent):\s*([^\n]+)/gi);
    const shortTermMatch = text.match(/(?:short.?term|soon):\s*([^\n]+)/gi);
    const longTermMatch = text.match(/(?:long.?term|future):\s*([^\n]+)/gi);

    return {
      immediate: immediateMatch ? immediateMatch.map(m => m.split(':')[1].trim()) : [],
      shortTerm: shortTermMatch ? shortTermMatch.map(m => m.split(':')[1].trim()) : [],
      longTerm: longTermMatch ? longTermMatch.map(m => m.split(':')[1].trim()) : []
    };
  }

  private extractEffort(text: string): PerformanceIssue['estimatedEffort'] {
    if (text.toLowerCase().includes('high effort')) {return 'high';}
    if (text.toLowerCase().includes('medium effort')) {return 'medium';}
    if (text.toLowerCase().includes('low effort')) {return 'low';}
    return 'medium';
  }

  private extractBusinessImpact(text: string): string {
    const impactMatch = text.match(/(?:impact|business|user):\s*([^\n]+)/i);
    return impactMatch ? impactMatch[1].trim() : 'Performance impact on user experience';
  }

  /**
   * Combine performance issues from different sources
   */
  private combinePerformanceIssues(
    patternIssues: PerformanceIssue[],
    aiIssues: PerformanceIssue[]
  ): PerformanceIssue[] {
    const combined = [...patternIssues, ...aiIssues];
    const deduped: PerformanceIssue[] = [];

    for (const issue of combined) {
      const isDuplicate = deduped.some(existing => 
        existing.location.file === issue.location.file &&
        existing.location.line === issue.location.line &&
        existing.type === issue.type
      );

      if (!isDuplicate) {
        deduped.push(issue);
      }
    }

    return deduped.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Create performance profile
   */
  private createPerformanceProfile(
    codeFiles: string[],
    runtimeMetrics?: Partial<PerformanceProfile>
  ): PerformanceProfile {
    // Use provided runtime metrics or create estimates
    return {
      executionTime: {
        total: runtimeMetrics?.executionTime?.total || 1000,
        breakdown: runtimeMetrics?.executionTime?.breakdown || {
          'initialization': 100,
          'main_logic': 700,
          'cleanup': 50,
          'database': 150
        }
      },
      memoryUsage: {
        peak: runtimeMetrics?.memoryUsage?.peak || 128,
        average: runtimeMetrics?.memoryUsage?.average || 64,
        leaks: runtimeMetrics?.memoryUsage?.leaks || []
      },
      cpuUtilization: {
        average: runtimeMetrics?.cpuUtilization?.average || 45,
        peaks: runtimeMetrics?.cpuUtilization?.peaks || [78, 82, 69],
        hotSpots: runtimeMetrics?.cpuUtilization?.hotSpots || ['main_loop', 'data_processing']
      },
      ioOperations: {
        fileSystem: runtimeMetrics?.ioOperations?.fileSystem || 12,
        network: runtimeMetrics?.ioOperations?.network || 8,
        database: runtimeMetrics?.ioOperations?.database || 15
      },
      cachingEfficiency: {
        hitRate: runtimeMetrics?.cachingEfficiency?.hitRate || 0.75,
        missRate: runtimeMetrics?.cachingEfficiency?.missRate || 0.25,
        opportunities: runtimeMetrics?.cachingEfficiency?.opportunities || ['database_queries', 'api_responses']
      }
    };
  }

  /**
   * Generate optimization strategies
   */
  private async generateOptimizationStrategies(
    issues: PerformanceIssue[],
    profile: PerformanceProfile
  ): Promise<OptimizationStrategy[]> {
    const strategies: OptimizationStrategy[] = [];

    // Group issues by type to generate targeted strategies
    const issuesByType = issues.reduce((acc, issue) => {
      if (!acc[issue.type]) {acc[issue.type] = [];}
      acc[issue.type].push(issue);
      return acc;
    }, {} as Record<string, PerformanceIssue[]>);

    for (const [type, typeIssues] of Object.entries(issuesByType)) {
      const strategy = this.createOptimizationStrategy(type, typeIssues, profile);
      strategies.push(strategy);
    }

    // Add general optimization strategies
    strategies.push(...this.getGeneralOptimizationStrategies(profile));

    return strategies.sort((a, b) => {
      const priorityOrder = { immediate: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Create optimization strategy for specific issue type
   */
  private createOptimizationStrategy(
    issueType: string,
    issues: PerformanceIssue[],
    profile: PerformanceProfile
  ): OptimizationStrategy {
    const strategyMap: Record<string, Partial<OptimizationStrategy>> = {
      cpu_intensive: {
        category: 'algorithm',
        strategy: 'Optimize CPU-intensive operations through algorithmic improvements and parallel processing',
        expectedGains: { performance: 35, cost: 20, scalability: 40 },
        implementation: {
          complexity: 'medium',
          timeEstimate: '2-3 weeks',
          dependencies: ['Performance profiling tools', 'Load testing framework'],
          risks: ['Potential regression during optimization', 'Increased code complexity']
        }
      },
      memory_leak: {
        category: 'architecture',
        strategy: 'Implement comprehensive memory management and resource cleanup',
        expectedGains: { performance: 50, cost: 30, scalability: 60 },
        implementation: {
          complexity: 'high',
          timeEstimate: '3-4 weeks',
          dependencies: ['Memory profiling tools', 'Automated testing'],
          risks: ['System instability during fixes', 'Breaking changes to API']
        }
      },
      database_slow: {
        category: 'database',
        strategy: 'Optimize database queries and implement intelligent caching',
        expectedGains: { performance: 45, cost: 25, scalability: 50 },
        implementation: {
          complexity: 'medium',
          timeEstimate: '2-3 weeks',
          dependencies: ['Database monitoring', 'Cache infrastructure'],
          risks: ['Data consistency issues', 'Cache invalidation complexity']
        }
      }
    };

    const baseStrategy = strategyMap[issueType] || {
      category: 'algorithm',
      strategy: 'General performance optimization',
      expectedGains: { performance: 20, cost: 15, scalability: 25 },
      implementation: {
        complexity: 'medium',
        timeEstimate: '1-2 weeks',
        dependencies: ['Performance monitoring'],
        risks: ['Unintended side effects']
      }
    };

    const severity = issues.reduce((max, issue) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const issueSeverity = severityOrder[issue.severity];
      const maxSeverity = severityOrder[max];
      return issueSeverity > maxSeverity ? issue.severity : max;
    }, 'low' as PerformanceIssue['severity']);

    const priority = severity === 'critical' ? 'immediate' :
                    severity === 'high' ? 'high' :
                    severity === 'medium' ? 'medium' : 'low';

    return {
      priority,
      category: baseStrategy.category!,
      strategy: baseStrategy.strategy!,
      expectedGains: baseStrategy.expectedGains!,
      implementation: baseStrategy.implementation!
    };
  }

  /**
   * Get general optimization strategies
   */
  private getGeneralOptimizationStrategies(profile: PerformanceProfile): OptimizationStrategy[] {
    const strategies: OptimizationStrategy[] = [];

    // Caching strategy
    if (profile.cachingEfficiency.hitRate < 0.8) {
      strategies.push({
        priority: 'high',
        category: 'caching',
        strategy: 'Implement advanced caching strategies to improve hit rates',
        expectedGains: { performance: 30, cost: 15, scalability: 35 },
        implementation: {
          complexity: 'medium',
          timeEstimate: '1-2 weeks',
          dependencies: ['Redis/Memcached infrastructure', 'Cache monitoring'],
          risks: ['Cache invalidation complexity', 'Memory overhead']
        }
      });
    }

    // Infrastructure strategy
    if (profile.cpuUtilization.average > 70) {
      strategies.push({
        priority: 'medium',
        category: 'infrastructure',
        strategy: 'Scale infrastructure to handle CPU load',
        expectedGains: { performance: 25, cost: -10, scalability: 50 },
        implementation: {
          complexity: 'low',
          timeEstimate: '1 week',
          dependencies: ['Cloud infrastructure', 'Load balancer'],
          risks: ['Increased operational costs', 'Complexity in deployment']
        }
      });
    }

    return strategies;
  }

  /**
   * Perform scalability analysis
   */
  private async performScalabilityAnalysis(
    codeFiles: string[],
    issues: PerformanceIssue[]
  ): Promise<PerformanceAssessment['scalabilityAnalysis']> {
    // Simplified scalability analysis
    const bottlenecks = issues
      .filter(issue => issue.metrics.impactScope === 'system' || issue.metrics.impactScope === 'global')
      .map(issue => issue.title);

    return {
      currentCapacity: 'Estimated 1000 concurrent users',
      bottlenecks,
      scalingRecommendations: [
        'Implement horizontal scaling',
        'Add database read replicas',
        'Implement microservices architecture',
        'Add CDN for static content'
      ]
    };
  }

  /**
   * Generate benchmark comparison
   */
  private generateBenchmarkComparison(profile: PerformanceProfile): PerformanceAssessment['benchmarkComparison'] {
    const responseTime = profile.executionTime.total;
    const memoryUsage = profile.memoryUsage.average;
    
    let industry = 'Below average';
    let competitors = 'Behind competitors';
    let improvement = 'Significant improvement needed';

    if (responseTime <= this.benchmarkData.get('api_response_excellent')! && 
        memoryUsage <= this.benchmarkData.get('memory_usage_excellent')!) {
      industry = 'Industry leading';
      competitors = 'Ahead of competitors';
      improvement = 'Maintain current excellence';
    } else if (responseTime <= this.benchmarkData.get('api_response_good')! && 
               memoryUsage <= this.benchmarkData.get('memory_usage_good')!) {
      industry = 'Above average';
      competitors = 'Competitive';
      improvement = 'Minor optimizations recommended';
    }

    return { industry, competitors, improvement };
  }

  /**
   * Generate final performance assessment
   */
  private generatePerformanceAssessment(
    issues: PerformanceIssue[],
    profile: PerformanceProfile,
    optimizationStrategies: OptimizationStrategy[],
    scalabilityAnalysis: PerformanceAssessment['scalabilityAnalysis'],
    benchmarkComparison: PerformanceAssessment['benchmarkComparison']
  ): PerformanceAssessment {
    // Calculate performance score
    const issueScore = this.calculateIssueScore(issues);
    const profileScore = this.calculateProfileScore(profile);
    const overallScore = Math.round((issueScore * 0.6) + (profileScore * 0.4));

    // Determine performance grade
    const performanceGrade = overallScore >= 90 ? 'A' :
                           overallScore >= 80 ? 'B' :
                           overallScore >= 70 ? 'C' :
                           overallScore >= 60 ? 'D' : 'F';

    return {
      overallScore,
      performanceGrade,
      issues,
      profile,
      optimizationStrategies,
      scalabilityAnalysis,
      benchmarkComparison
    };
  }

  /**
   * Calculate score based on issues (0-100, higher is better)
   */
  private calculateIssueScore(issues: PerformanceIssue[]): number {
    if (issues.length === 0) {return 100;}

    const weights = { critical: 30, high: 15, medium: 8, low: 3 };
    const totalWeight = issues.reduce((sum, issue) => sum + weights[issue.severity], 0);
    
    return Math.max(0, 100 - Math.min(100, totalWeight));
  }

  /**
   * Calculate score based on performance profile (0-100, higher is better)
   */
  private calculateProfileScore(profile: PerformanceProfile): number {
    let score = 100;

    // Response time score
    const responseTime = profile.executionTime.total;
    if (responseTime > this.benchmarkData.get('api_response_poor')!) {score -= 30;}
    else if (responseTime > this.benchmarkData.get('api_response_acceptable')!) {score -= 20;}
    else if (responseTime > this.benchmarkData.get('api_response_good')!) {score -= 10;}

    // Memory usage score
    const memoryUsage = profile.memoryUsage.average;
    if (memoryUsage > this.benchmarkData.get('memory_usage_poor')!) {score -= 25;}
    else if (memoryUsage > this.benchmarkData.get('memory_usage_acceptable')!) {score -= 15;}
    else if (memoryUsage > this.benchmarkData.get('memory_usage_good')!) {score -= 8;}

    // CPU utilization score
    if (profile.cpuUtilization.average > 85) {score -= 20;}
    else if (profile.cpuUtilization.average > 70) {score -= 10;}
    else if (profile.cpuUtilization.average > 50) {score -= 5;}

    // Caching efficiency score
    if (profile.cachingEfficiency.hitRate < 0.5) {score -= 15;}
    else if (profile.cachingEfficiency.hitRate < 0.7) {score -= 10;}
    else if (profile.cachingEfficiency.hitRate < 0.8) {score -= 5;}

    return Math.max(0, score);
  }

  /**
   * Cleanup and dispose resources
   */
  public dispose(): void {
    this.removeAllListeners();
    this.logger.info('PerformanceAnalysisAgent disposed');
  }
}

export type { PerformanceIssue, PerformanceProfile, OptimizationStrategy, PerformanceAssessment };