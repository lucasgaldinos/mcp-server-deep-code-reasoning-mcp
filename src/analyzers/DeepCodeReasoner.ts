/**
 * @file This file contains the DeepCodeReasoner class, which is responsible for performing deep code analysis.
 * @author Your Name
 * @version 1.0.0
 * @license MIT
 */
import type {
  ClaudeCodeContext,
  DeepAnalysisResult,
  RootCause,
  ExecutionPath,
  PerformanceIssue,
  Hypothesis,
  Action,
  CodeChange,
  Insight,
  CodeLocation,
  SystemImpact,
} from '../models/types.js';
import { ExecutionTracer } from './ExecutionTracer.js';
import { SystemBoundaryAnalyzer } from './SystemBoundaryAnalyzer.js';
import { PerformanceModeler } from './PerformanceModeler.js';
import { HypothesisTester } from './HypothesisTester.js';

/**
 * Represents an execution graph.
 * @interface
 */
interface ExecutionGraph {
  nodes: Map<string, ExecutionNode>;
  edges: Array<{ from: string; to: string; condition?: string }>;
  entryPoint: string;
}

/**
 * Represents a node in an execution graph.
 * @interface
 */
interface ExecutionNode {
  id: string;
  location: CodeLocation;
  type: 'function' | 'method' | 'conditional' | 'loop' | 'assignment';
  data: unknown;
  children: ExecutionNode[];
}

/**
 * Represents a report of the impact of a change.
 * @interface
 */
interface ImpactReport {
  breakingChanges: BreakingChange[];
  performanceImplications: PerformanceIssue[];
  systemImpacts: SystemImpact[];
}

/**
 * Represents a breaking change.
 * @interface
 */
interface BreakingChange {
  service: string;
  description: string;
  affectedLocations: CodeLocation[];
  confidence: number;
  mitigation: string;
  file?: string;
}

/**
 * The DeepCodeReasoner class is responsible for performing deep code analysis.
 * @class
 */
export class DeepCodeReasoner {
  private executionTracer: ExecutionTracer;
  private systemAnalyzer: SystemBoundaryAnalyzer;
  private performanceModeler: PerformanceModeler;
  private hypothesisTester: HypothesisTester;

  /**
   * Creates an instance of DeepCodeReasoner.
   */
  constructor() {
    this.executionTracer = new ExecutionTracer();
    this.systemAnalyzer = new SystemBoundaryAnalyzer();
    this.performanceModeler = new PerformanceModeler();
    this.hypothesisTester = new HypothesisTester();
  }

  /**
   * Escalates analysis from Claude Code to Gemini.
   * @param {ClaudeCodeContext} context - The context from Claude Code.
   * @param {string} analysisType - The type of analysis to perform.
   * @param {number} depthLevel - The depth of the analysis.
   * @returns {Promise<DeepAnalysisResult>} The result of the analysis.
   */
  async escalateFromClaudeCode(
    context: ClaudeCodeContext,
    analysisType: string,
    depthLevel: number,
  ): Promise<DeepAnalysisResult> {
    const startTime = Date.now();
    const timeoutMs = context.analysisBudgetRemaining * 1000;

    try {
      // Understand what Claude Code already tried
      const priorAttempts = this.parseClaudeAttempts(context.attemptedApproaches);

      // Identify the specific reasoning gap
      const gapType = this.classifyReasoningGap(context.stuckPoints);

      // Apply specialized analysis strategy
      let result: DeepAnalysisResult;

      switch (analysisType) {
        case 'execution_trace':
          result = await this.performExecutionAnalysis(context, depthLevel, timeoutMs);
          break;
        case 'cross_system':
          result = await this.performCrossSystemAnalysis(context, depthLevel, timeoutMs);
          break;
        case 'performance':
          result = await this.performPerformanceAnalysis(context, depthLevel, timeoutMs);
          break;
        case 'hypothesis_test':
          result = await this.performHypothesisAnalysis(context, depthLevel, timeoutMs);
          break;
        default:
          result = await this.performGeneralAnalysis(context, gapType, depthLevel, timeoutMs);
      }

      // Enrich with insights from prior attempts
      result.enrichedContext.ruledOutApproaches = priorAttempts;

      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > timeoutMs) {
        result.status = 'partial';
      }

      return result;
    } catch (error) {
      return this.createErrorResult(error as Error, context);
    }
  }

  /**
   * Parses the attempts made by Claude Code.
   * @param {string[]} approaches - The approaches taken by Claude Code.
   * @returns {string[]} The parsed attempts.
   * @private
   */
  private parseClaudeAttempts(approaches: string[]): string[] {
    return approaches.map(approach => {
      // Extract key insights from each attempt
      const keyActions = this.extractKeyActions(approach);
      return keyActions.join(' → ');
    });
  }

  /**
   * Extracts key actions from an approach string.
   * @param {string} approach - The approach string.
   * @returns {string[]} The key actions.
   * @private
   */
  private extractKeyActions(approach: string): string[] {
    const actionPatterns = [
      /profile[d]?\s+(\w+)/gi,
      /check[ed]?\s+(\w+)/gi,
      /analyz[ed]?\s+(\w+)/gi,
      /review[ed]?\s+(\w+)/gi,
    ];

    const actions: string[] = [];
    for (const pattern of actionPatterns) {
      const matches = approach.matchAll(pattern);
      for (const match of matches) {
        actions.push(match[0]);
      }
    }
    return actions.length > 0 ? actions : [approach];
  }

  /**
   * Classifies the reasoning gap based on the stuck points.
   * @param {string[]} stuckPoints - The points where Claude Code got stuck.
   * @returns {string} The type of reasoning gap.
   * @private
   */
  private classifyReasoningGap(stuckPoints: string[]): string {
    const gapIndicators = {
      execution_flow: ['execution', 'flow', 'trace', 'call', 'sequence'],
      cross_system: ['service', 'boundary', 'api', 'distributed', 'cross'],
      performance_modeling: ['performance', 'slow', 'bottleneck', 'latency', 'throughput'],
      state_complexity: ['state', 'complex', 'interaction', 'dependency'],
      ambiguous: ['multiple', 'unclear', 'ambiguous', 'possible'],
    };

    const scores: Record<string, number> = {};

    for (const point of stuckPoints) {
      const lowerPoint = point.toLowerCase();
      for (const [gapType, indicators] of Object.entries(gapIndicators)) {
        scores[gapType] = scores[gapType] || 0;
        for (const indicator of indicators) {
          if (lowerPoint.includes(indicator)) {
            scores[gapType]++;
          }
        }
      }
    }

    // Return the gap type with highest score
    return Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b))[0] || 'ambiguous';
  }

  /**
   * Performs execution analysis.
   * @param {ClaudeCodeContext} context - The context from Claude Code.
   * @param {number} depthLevel - The depth of the analysis.
   * @param {number} _timeoutMs - The timeout for the analysis.
   * @returns {Promise<DeepAnalysisResult>} The result of the analysis.
   * @private
   */
  private async performExecutionAnalysis(
    context: ClaudeCodeContext,
    depthLevel: number,
    _timeoutMs: number,
  ): Promise<DeepAnalysisResult> {
    const entryPoints = context.focusArea.entryPoints || [];
    const executionPaths: ExecutionPath[] = [];
    const rootCauses: RootCause[] = [];

    for (const entryPoint of entryPoints) {
      const graph = await this.executionTracer.traceSemanticFlow(
        entryPoint,
        depthLevel * 3,
        true,
      );

      // Analyze execution patterns
      const patterns = this.analyzeExecutionPatterns(graph);
      executionPaths.push(...patterns.paths);

      // Identify potential issues
      if (patterns.issues.length > 0) {
        rootCauses.push(...patterns.issues.map(issue => ({
          type: 'execution_flow',
          description: issue.description,
          evidence: issue.locations,
          confidence: issue.confidence,
          fixStrategy: issue.suggestion,
        })));
      }
    }

    return {
      status: 'success',
      findings: {
        rootCauses,
        executionPaths,
        performanceBottlenecks: [],
        crossSystemImpacts: [],
      },
      recommendations: {
        immediateActions: this.generateExecutionActions(rootCauses),
        investigationNextSteps: this.generateExecutionNextSteps(executionPaths),
        codeChangesNeeded: this.generateExecutionCodeChanges(rootCauses),
      },
      enrichedContext: {
        newInsights: this.extractExecutionInsights(executionPaths),
        validatedHypotheses: [],
        ruledOutApproaches: [],
      },
    };
  }

  /**
   * Performs cross-system analysis.
   * @param {ClaudeCodeContext} context - The context from Claude Code.
   * @param {number} _depthLevel - The depth of the analysis.
   * @param {number} _timeoutMs - The timeout for the analysis.
   * @returns {Promise<DeepAnalysisResult>} The result of the analysis.
   * @private
   */
  private async performCrossSystemAnalysis(
    context: ClaudeCodeContext,
    _depthLevel: number,
    _timeoutMs: number,
  ): Promise<DeepAnalysisResult> {
    const impacts = await this.systemAnalyzer.analyzeCrossServiceImpact(
      context.focusArea,
      ['breaking', 'performance', 'behavioral'],
    );

    const rootCauses: RootCause[] = [];

    // Analyze breaking changes
    for (const impact of impacts.breakingChanges) {
      rootCauses.push({
        type: 'cross_system_breaking',
        description: `Breaking change in ${impact.service}: ${impact.description}`,
        evidence: impact.affectedLocations,
        confidence: impact.confidence,
        fixStrategy: impact.mitigation,
      });
    }

    return {
      status: 'success',
      findings: {
        rootCauses,
        executionPaths: [],
        performanceBottlenecks: impacts.performanceImplications,
        crossSystemImpacts: impacts.systemImpacts,
      },
      recommendations: {
        immediateActions: this.generateCrossSystemActions(impacts),
        investigationNextSteps: this.generateCrossSystemNextSteps(impacts),
        codeChangesNeeded: this.generateCrossSystemCodeChanges(impacts),
      },
      enrichedContext: {
        newInsights: this.extractCrossSystemInsights(impacts),
        validatedHypotheses: [],
        ruledOutApproaches: [],
      },
    };
  }

  /**
   * Performs performance analysis.
   * @param {ClaudeCodeContext} context - The context from Claude Code.
   * @param {number} depthLevel - The depth of the analysis.
   * @param {number} _timeoutMs - The timeout for the analysis.
   * @returns {Promise<DeepAnalysisResult>} The result of the analysis.
   * @private
   */
  private async performPerformanceAnalysis(
    context: ClaudeCodeContext,
    depthLevel: number,
    _timeoutMs: number,
  ): Promise<DeepAnalysisResult> {
    const entryPoints = context.focusArea.entryPoints || [];
    const performanceIssues: PerformanceIssue[] = [];
    const rootCauses: RootCause[] = [];

    for (const entryPoint of entryPoints) {
      const perfModel = await this.performanceModeler.analyzePerformance(
        entryPoint,
        depthLevel,
        [],
      );

      performanceIssues.push(...perfModel.bottlenecks);

      // Convert bottlenecks to root causes
      for (const bottleneck of perfModel.bottlenecks) {
        if (bottleneck.impact.estimatedLatency > 100) { // > 100ms
          rootCauses.push({
            type: `performance_${bottleneck.type}`,
            description: `Performance bottleneck: ${bottleneck.type}`,
            evidence: [bottleneck.location],
            confidence: 0.8,
            fixStrategy: bottleneck.suggestion,
          });
        }
      }
    }

    return {
      status: 'success',
      findings: {
        rootCauses,
        executionPaths: [],
        performanceBottlenecks: performanceIssues,
        crossSystemImpacts: [],
      },
      recommendations: {
        immediateActions: this.generatePerformanceActions(performanceIssues),
        investigationNextSteps: this.generatePerformanceNextSteps(performanceIssues),
        codeChangesNeeded: this.generatePerformanceCodeChanges(performanceIssues),
      },
      enrichedContext: {
        newInsights: this.extractPerformanceInsights(performanceIssues),
        validatedHypotheses: [],
        ruledOutApproaches: [],
      },
    };
  }

  /**
   * Performs hypothesis analysis.
   * @param {ClaudeCodeContext} context - The context from Claude Code.
   * @param {number} _depthLevel - The depth of the analysis.
   * @param {number} _timeoutMs - The timeout for the analysis.
   * @returns {Promise<DeepAnalysisResult>} The result of the analysis.
   * @private
   */
  private async performHypothesisAnalysis(
    context: ClaudeCodeContext,
    _depthLevel: number,
    _timeoutMs: number,
  ): Promise<DeepAnalysisResult> {
    // Generate hypotheses based on stuck points
    const hypotheses = this.generateHypotheses(context);
    const validatedHypotheses: Hypothesis[] = [];
    const rootCauses: RootCause[] = [];

    for (const hypothesis of hypotheses) {
      const result = await this.hypothesisTester.testHypothesis(
        hypothesis.description,
        context.focusArea,
        hypothesis.testApproach,
      );

      if (result.validated) {
        validatedHypotheses.push(result);

        // Convert validated hypothesis to root cause
        rootCauses.push({
          type: 'hypothesis_validated',
          description: hypothesis.description,
          evidence: result.evidence.map(e => ({
            file: e,
            line: 0,
          })),
          confidence: 0.9,
          fixStrategy: result.suggestedFix || 'Apply fix based on validated hypothesis',
        });
      }
    }

    return {
      status: 'success',
      findings: {
        rootCauses,
        executionPaths: [],
        performanceBottlenecks: [],
        crossSystemImpacts: [],
      },
      recommendations: {
        immediateActions: this.generateHypothesisActions(validatedHypotheses),
        investigationNextSteps: this.generateHypothesisNextSteps(hypotheses, validatedHypotheses),
        codeChangesNeeded: this.generateHypothesisCodeChanges(validatedHypotheses),
      },
      enrichedContext: {
        newInsights: this.extractHypothesisInsights(validatedHypotheses),
        validatedHypotheses,
        ruledOutApproaches: hypotheses
          .filter(h => !validatedHypotheses.find(v => v.id === h.id))
          .map(h => h.description),
      },
    };
  }

  /**
   * Performs general analysis.
   * @param {ClaudeCodeContext} context - The context from Claude Code.
   * @param {string} gapType - The type of reasoning gap.
   * @param {number} depthLevel - The depth of the analysis.
   * @param {number} timeoutMs - The timeout for the analysis.
   * @returns {Promise<DeepAnalysisResult>} The result of the analysis.
   * @private
   */
  private async performGeneralAnalysis(
    context: ClaudeCodeContext,
    gapType: string,
    depthLevel: number,
    timeoutMs: number,
  ): Promise<DeepAnalysisResult> {
    // Delegate to appropriate analyzer based on gap type
    switch (gapType) {
      case 'execution_flow':
        return this.performExecutionAnalysis(context, depthLevel, timeoutMs);
      case 'cross_system':
        return this.performCrossSystemAnalysis(context, depthLevel, timeoutMs);
      case 'performance_modeling':
        return this.performPerformanceAnalysis(context, depthLevel, timeoutMs);
      default:
        return this.performHypothesisAnalysis(context, depthLevel, timeoutMs);
    }
  }

  /**
   * Analyzes execution patterns.
   * @param {ExecutionGraph} _graph - The execution graph.
   * @returns {{ paths: ExecutionPath[]; issues: Array<{ description: string; locations: CodeLocation[]; confidence: number; suggestion: string; }> }} The analysis result.
   * @private
   */
  private analyzeExecutionPatterns(_graph: ExecutionGraph): {
    paths: ExecutionPath[];
    issues: Array<{
      description: string;
      locations: CodeLocation[];
      confidence: number;
      suggestion: string;
    }>;
  } {
    // Simplified pattern analysis
    return {
      paths: [],
      issues: [],
    };
  }

  /**
   * Generates execution actions.
   * @param {RootCause[]} rootCauses - The root causes.
   * @returns {Action[]} The generated actions.
   * @private
   */
  private generateExecutionActions(rootCauses: RootCause[]): Action[] {
    return rootCauses.map(cause => ({
      type: 'fix',
      description: `Fix ${cause.type}: ${cause.description}`,
      priority: 'high',
      estimatedEffort: '1-2 hours',
    }));
  }

  /**
   * Generates next steps for execution analysis.
   * @param {ExecutionPath[]} _paths - The execution paths.
   * @returns {string[]} The next steps.
   * @private
   */
  private generateExecutionNextSteps(_paths: ExecutionPath[]): string[] {
    return [
      'Review identified execution paths for optimization opportunities',
      'Check for unnecessary loops or redundant operations',
      'Validate state management across execution flow',
    ];
  }

  /**
   * Generates code changes for execution analysis.
   * @param {RootCause[]} rootCauses - The root causes.
   * @returns {CodeChange[]} The generated code changes.
   * @private
   */
  private generateExecutionCodeChanges(rootCauses: RootCause[]): CodeChange[] {
    return rootCauses.map(cause => ({
      file: cause.evidence[0]?.file || 'unknown',
      changeType: 'modify',
      description: cause.fixStrategy,
    }));
  }

  /**
   * Extracts insights from execution analysis.
   * @param {ExecutionPath[]} paths - The execution paths.
   * @returns {Insight[]} The extracted insights.
   * @private
   */
  private extractExecutionInsights(paths: ExecutionPath[]): Insight[] {
    return [
      {
        type: 'execution_pattern',
        description: `Analyzed ${paths.length} execution paths`,
        supporting_evidence: paths.map(p => p.id),
      },
    ];
  }

  /**
   * Generates actions for cross-system analysis.
   * @param {ImpactReport} impacts - The impact report.
   * @returns {Action[]} The generated actions.
   * @private
   */
  private generateCrossSystemActions(impacts: ImpactReport): Action[] {
    const actions: Action[] = [];

    if (impacts.breakingChanges.length > 0) {
      actions.push({
        type: 'fix',
        description: 'Address breaking API changes',
        priority: 'critical',
        estimatedEffort: '2-4 hours',
      });
    }

    return actions;
  }

  /**
   * Generates next steps for cross-system analysis.
   * @param {ImpactReport} _impacts - The impact report.
   * @returns {string[]} The next steps.
   * @private
   */
  private generateCrossSystemNextSteps(_impacts: ImpactReport): string[] {
    return [
      'Update API documentation for changed endpoints',
      'Notify downstream service owners of changes',
      'Plan migration strategy for breaking changes',
    ];
  }

  /**
   * Generates code changes for cross-system analysis.
   * @param {ImpactReport} impacts - The impact report.
   * @returns {CodeChange[]} The generated code changes.
   * @private
   */
  private generateCrossSystemCodeChanges(impacts: ImpactReport): CodeChange[] {
    return impacts.breakingChanges.map((change) => ({
      file: change.file || 'unknown',
      changeType: 'modify' as const,
      description: change.mitigation,
    }));
  }

  /**
   * Extracts insights from cross-system analysis.
   * @param {ImpactReport} impacts - The impact report.
   * @returns {Insight[]} The extracted insights.
   * @private
   */
  private extractCrossSystemInsights(impacts: ImpactReport): Insight[] {
    return [
      {
        type: 'system_dependencies',
        description: `Found ${impacts.systemImpacts.length} cross-system impacts`,
        supporting_evidence: impacts.systemImpacts.map((i) => i.service),
      },
    ];
  }

  /**
   * Generates actions for performance analysis.
   * @param {PerformanceIssue[]} issues - The performance issues.
   * @returns {Action[]} The generated actions.
   * @private
   */
  private generatePerformanceActions(issues: PerformanceIssue[]): Action[] {
    return issues
      .filter(issue => issue.impact.estimatedLatency > 100)
      .map(issue => ({
        type: 'fix',
        description: `Optimize ${issue.type}: ${issue.suggestion}`,
        priority: issue.impact.estimatedLatency > 1000 ? 'critical' : 'high',
        estimatedEffort: '2-4 hours',
      }));
  }

  /**
   * Generates next steps for performance analysis.
   * @param {PerformanceIssue[]} _issues - The performance issues.
   * @returns {string[]} The next steps.
   * @private
   */
  private generatePerformanceNextSteps(_issues: PerformanceIssue[]): string[] {
    return [
      'Profile application under realistic load',
      'Implement caching for frequently accessed data',
      'Consider async processing for heavy operations',
    ];
  }

  /**
   * Generates code changes for performance analysis.
   * @param {PerformanceIssue[]} issues - The performance issues.
   * @returns {CodeChange[]} The generated code changes.
   * @private
   */
  private generatePerformanceCodeChanges(issues: PerformanceIssue[]): CodeChange[] {
    return issues.map(issue => ({
      file: issue.location.file,
      changeType: 'modify',
      description: issue.suggestion,
    }));
  }

  /**
   * Extracts insights from performance analysis.
   * @param {PerformanceIssue[]} issues - The performance issues.
   * @returns {Insight[]} The extracted insights.
   * @private
   */
  private extractPerformanceInsights(issues: PerformanceIssue[]): Insight[] {
    const totalLatency = issues.reduce((sum, issue) => sum + issue.impact.estimatedLatency, 0);

    return [
      {
        type: 'performance_impact',
        description: `Total estimated latency impact: ${totalLatency}ms`,
        supporting_evidence: issues.map(i => `${i.type}: ${i.impact.estimatedLatency}ms`),
      },
    ];
  }

  /**
   * Generates hypotheses based on the context.
   * @param {ClaudeCodeContext} context - The context from Claude Code.
   * @returns {Hypothesis[]} The generated hypotheses.
   * @private
   */
  private generateHypotheses(context: ClaudeCodeContext): Hypothesis[] {
    const hypotheses: Hypothesis[] = [];

    // Generate hypotheses based on stuck points
    for (const point of context.stuckPoints) {
      if (point.includes('performance')) {
        hypotheses.push({
          id: `hyp_${Date.now()}_perf`,
          description: 'Performance issue caused by N+1 query pattern',
          testApproach: 'Trace database queries in execution flow',
          validated: false,
          evidence: [],
        });
      }

      if (point.includes('state') || point.includes('complex')) {
        hypotheses.push({
          id: `hyp_${Date.now()}_state`,
          description: 'Race condition in concurrent state updates',
          testApproach: 'Analyze concurrent access patterns',
          validated: false,
          evidence: [],
        });
      }
    }

    return hypotheses;
  }

  /**
   * Generates actions for hypothesis analysis.
   * @param {Hypothesis[]} validated - The validated hypotheses.
   * @returns {Action[]} The generated actions.
   * @private
   */
  private generateHypothesisActions(validated: Hypothesis[]): Action[] {
    return validated.map(hyp => ({
      type: 'fix',
      description: `Implement fix for: ${hyp.description}`,
      priority: 'high',
      estimatedEffort: '2-3 hours',
    }));
  }

  /**
   * Generates next steps for hypothesis analysis.
   * @param {Hypothesis[]} all - All hypotheses.
   * @param {Hypothesis[]} validated - The validated hypotheses.
   * @returns {string[]} The next steps.
   * @private
   */
  private generateHypothesisNextSteps(all: Hypothesis[], validated: Hypothesis[]): string[] {
    const invalidated = all.filter(h => !validated.find(v => v.id === h.id));

    return [
      `Validated ${validated.length} of ${all.length} hypotheses`,
      ...invalidated.map(h => `Ruled out: ${h.description}`),
    ];
  }

  /**
   * Generates code changes for hypothesis analysis.
   * @param {Hypothesis[]} validated - The validated hypotheses.
   * @returns {CodeChange[]} The generated code changes.
   * @private
   */
  private generateHypothesisCodeChanges(validated: Hypothesis[]): CodeChange[] {
    return validated.map(hyp => ({
      file: hyp.evidence[0] || 'unknown',
      changeType: 'modify',
      description: `Fix based on validated hypothesis: ${hyp.description}`,
    }));
  }

  /**
   * Extracts insights from hypothesis analysis.
   * @param {Hypothesis[]} validated - The validated hypotheses.
   * @returns {Insight[]} The extracted insights.
   * @private
   */
  private extractHypothesisInsights(validated: Hypothesis[]): Insight[] {
    return validated.map(hyp => ({
      type: 'validated_hypothesis',
      description: hyp.description,
      supporting_evidence: hyp.evidence,
    }));
  }

  /**
   * Creates an error result.
   * @param {Error} error - The error.
   * @param {ClaudeCodeContext} context - The context from Claude Code.
   * @returns {DeepAnalysisResult} The error result.
   * @private
   */
  private createErrorResult(error: Error, context: ClaudeCodeContext): DeepAnalysisResult {
    return {
      status: 'partial',
      findings: {
        rootCauses: [],
        executionPaths: [],
        performanceBottlenecks: [],
        crossSystemImpacts: [],
      },
      recommendations: {
        immediateActions: [
          {
            type: 'investigate',
            description: `Investigate error: ${error.message}`,
            priority: 'high',
            estimatedEffort: '1 hour',
          },
        ],
        investigationNextSteps: [
          'Check logs for more details',
          'Verify all dependencies are available',
          'Consider breaking down the analysis into smaller parts',
        ],
        codeChangesNeeded: [],
      },
      enrichedContext: {
        newInsights: [],
        validatedHypotheses: [],
        ruledOutApproaches: context.attemptedApproaches,
      },
    };
  }
}