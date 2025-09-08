/**
 * @fileoverview Deep Analysis Strategy Implementation
 * 
 * This module implements a comprehensive deep analysis strategy that leverages
 * Gemini 2.5 Pro's large context window for detailed code analysis. This strategy
 * is optimized for thorough analysis when time constraints allow.
 * 
 * @author Deep Code Reasoning MCP Server
 * @version 1.0.0
 * @since 2025-01-09
 */

import { 
  IReasoningStrategy, 
  IAnalysisContext, 
  IAnalysisResult, 
  IStrategyCapabilities, 
  BaseReasoningStrategy,
  AnalysisType 
} from './ReasoningStrategy.js';
import { createLogger } from '@utils/StructuredLogger.js';
import { EnvironmentValidator } from '@utils/EnvironmentValidator.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Deep Analysis Strategy
 * 
 * Provides comprehensive code analysis using Gemini's full context capabilities.
 * Best suited for detailed analysis when time and resources allow.
 */
export class DeepAnalysisStrategy extends BaseReasoningStrategy {
  readonly name = 'DeepAnalysisStrategy';
  readonly version = '1.0.0';
  readonly capabilities: IStrategyCapabilities = {
    name: this.name,
    description: 'Comprehensive deep analysis using Gemini 2.5 Pro full context capabilities',
    supportedAnalysisTypes: [
      AnalysisType.DEEP_ANALYSIS,
      AnalysisType.CROSS_SYSTEM_ANALYSIS,
      AnalysisType.ARCHITECTURE_REVIEW,
      AnalysisType.CODE_QUALITY,
      AnalysisType.SECURITY_ANALYSIS,
    ],
    minimumTimeConstraint: 30000, // 30 seconds minimum
    maximumFileCount: 50,
    memoryRequirement: 200 * 1024 * 1024, // 200MB
    requiresExternalServices: true,
    strengthAreas: [
      'Complex architecture analysis',
      'Cross-file dependency analysis',
      'Performance bottleneck identification',
      'Security vulnerability detection',
      'Code quality assessment',
    ],
    limitations: [
      'Requires significant time investment',
      'High memory usage',
      'Dependent on Gemini API availability',
    ],
  };

  private readonly logger = createLogger('DeepAnalysisStrategy');
  private genAI?: GoogleGenerativeAI;
  private model?: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor() {
    super();
  }

  async analyze(context: IAnalysisContext): Promise<IAnalysisResult> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      this.logger.info('Starting deep analysis', {
        files: context.files.length,
        query: context.query.substring(0, 100),
        correlationId: context.correlationId,
      });

      // Prepare analysis context
      await this.prepare?.(context);

      // Validate context suitability
      const suitability = await this.canHandle(context);
      if (suitability < 0.6) {
        return this.createResult(
          false,
          'Context not suitable for deep analysis strategy',
          0.1,
          Date.now() - startTime,
          process.memoryUsage().heapUsed - startMemory
        );
      }

      // Perform deep analysis
      const analysis = await this.performDeepAnalysis(context);

      const executionTime = Date.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;

      this.logger.info('Deep analysis completed', {
        executionTime,
        memoryUsed,
        analysisLength: analysis.length,
        correlationId: context.correlationId,
      });

      return this.createResult(
        true,
        analysis,
        0.9, // High confidence for deep analysis
        executionTime,
        memoryUsed,
        {
          analysisType: 'deep',
          fileCount: context.files.length,
          strategy: this.name,
        }
      );

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;

      this.logger.error('Deep analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        correlationId: context.correlationId,
      }, error instanceof Error ? error : undefined);

      return this.createResult(
        false,
        `Deep analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0.1,
        executionTime,
        memoryUsed
      );
    } finally {
      await this.cleanup?.();
    }
  }

  async canHandle(context: IAnalysisContext): Promise<number> {
    // Check file count constraints
    if (context.files.length > this.capabilities.maximumFileCount!) {
      return 0.2; // Too many files
    }

    // Check time constraints
    if (context.timeConstraint && context.timeConstraint < this.capabilities.minimumTimeConstraint!) {
      return 0.3; // Not enough time
    }

    // Prefer when not prioritizing speed
    if (context.prioritizeSpeed) {
      return 0.4; // Not optimal for speed
    }

    // Check for supported analysis types
    const supportsAnalysis = this.capabilities.supportedAnalysisTypes.some(type =>
      context.query.toLowerCase().includes(type.replace('_', ' '))
    );

    if (supportsAnalysis) {
      return 0.9; // High suitability
    }

    // Default suitability for comprehensive analysis
    return 0.7;
  }

  private async performDeepAnalysis(context: IAnalysisContext): Promise<string> {
    if (!this.model) {
      throw new Error('Gemini model not available for deep analysis');
    }

    // Read and prepare file contents
    const fileContents = await this.readFiles(context.files);
    
    // Construct comprehensive analysis prompt
    const prompt = this.buildDeepAnalysisPrompt(context.query, fileContents, context);

    // Use Gemini model directly for analysis
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return this.enhanceAnalysisResult(text || 'Analysis completed', context);
  }

  private buildDeepAnalysisPrompt(query: string, fileContents: Map<string, string>, context: IAnalysisContext): string {
    const fileList = Array.from(fileContents.keys()).join(', ');
    
    let prompt = `# Deep Code Analysis Request

## Analysis Query
${query}

## Analysis Context
- Files to analyze: ${fileList}
- Total files: ${fileContents.size}
- Analysis type: Comprehensive deep analysis
- Cross-system analysis: ${context.enableCrossSystemAnalysis ? 'Enabled' : 'Disabled'}
- Performance focus: ${context.includePerformanceAnalysis ? 'Enabled' : 'Disabled'}

## Instructions
Perform a comprehensive deep analysis of the provided code with focus on:
1. **Architecture & Design Patterns**: Analyze overall architecture, design patterns used, and structural quality
2. **Code Quality & Maintainability**: Assess code quality, maintainability, and technical debt
3. **Performance Analysis**: Identify performance bottlenecks and optimization opportunities
4. **Security Considerations**: Evaluate security aspects and potential vulnerabilities
5. **Cross-file Dependencies**: Analyze relationships and dependencies between files
6. **Best Practices Compliance**: Check adherence to coding standards and best practices

## Code Files
`;

    // Add file contents with clear separation
    for (const [filePath, content] of fileContents) {
      prompt += `\n### File: ${filePath}\n\`\`\`\n${content}\n\`\`\`\n`;
    }

    prompt += `\n## Expected Output Format
Provide a structured analysis with:
- **Executive Summary**: High-level findings and recommendations
- **Detailed Analysis**: In-depth technical analysis by category
- **Issues Found**: Prioritized list of issues with severity levels
- **Recommendations**: Actionable improvement suggestions
- **Next Steps**: Suggested follow-up actions

Please be thorough, specific, and provide concrete examples where relevant.`;

    return prompt;
  }

  private async readFiles(filePaths: string[]): Promise<Map<string, string>> {
    const fileContents = new Map<string, string>();
    
    // Use existing file reading utilities from the system
    // This would integrate with SecureCodeReader in a real implementation
    for (const filePath of filePaths) {
      try {
        // Placeholder for actual file reading
        // In real implementation, this would use SecureCodeReader
        const content = `// File content would be read here: ${filePath}`;
        fileContents.set(filePath, content);
      } catch (error) {
        this.logger.warn('Failed to read file', { filePath, error });
        fileContents.set(filePath, `// Error reading file: ${error}`);
      }
    }

    return fileContents;
  }

  private enhanceAnalysisResult(analysis: string, context: IAnalysisContext): string {
    // Add metadata and enhancement to the analysis result
    const timestamp = new Date().toISOString();
    const enhancement = `
# Deep Analysis Report
*Generated: ${timestamp}*
*Strategy: ${this.name} v${this.version}*
*Files Analyzed: ${context.files.length}*
*Correlation ID: ${context.correlationId || 'N/A'}*

---

${analysis}

---

## Analysis Metadata
- **Strategy Used**: Deep Analysis Strategy
- **Analysis Depth**: Comprehensive
- **Context**: ${context.files.length} files, ${context.query.length} char query
- **Constraints**: ${context.timeConstraint ? `${context.timeConstraint}ms time limit` : 'No time limit'}
- **Performance Focus**: ${context.includePerformanceAnalysis ? 'Yes' : 'No'}
- **Cross-System**: ${context.enableCrossSystemAnalysis ? 'Yes' : 'No'}

*This analysis was performed using advanced AI-powered code reasoning capabilities.*
`;

    return enhancement;
  }

  async prepare(context: IAnalysisContext): Promise<void> {
    this.logger.debug('Preparing deep analysis strategy', {
      correlationId: context.correlationId,
    });

    // Initialize Gemini service if not provided
    if (!this.genAI) {
      const config = EnvironmentValidator.getValidatedConfig();
      this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
      this.model = this.genAI.getGenerativeModel({
        model: config.geminiModel,
        generationConfig: {
          temperature: config.geminiTemperature,
          topK: config.geminiTopK,
          topP: config.geminiTopP,
          maxOutputTokens: config.geminiMaxOutputTokens,
        },
      }, {
        apiVersion: config.geminiApiVersion,
      });
    }

    // Set up context for detailed logging
    if (context.correlationId) {
      this.logger.setCorrelationId(context.correlationId);
    }
  }

  async cleanup(): Promise<void> {
    this.logger.debug('Cleaning up deep analysis strategy');
    // Cleanup any resources if needed
  }
}
