#!/usr/bin/env node
/**
 * @file This is the main entry point for the Deep Code Reasoning MCP server.
 * It sets up the server, defines the available tools, and handles requests.
 * @author Your Name
 * @version 1.0.0
 * @license MIT
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as dotenv from 'dotenv';

import { DeepCodeReasonerV2 } from '@analyzers/DeepCodeReasonerV2.js';
import { ApiManager, ApiManagerConfig, ApiProvider } from '@services/api-manager.js';
import { GeminiService } from '@services/gemini-service.js';
import { OpenAIService } from '@services/openai-service.js';
import type { ClaudeCodeContext } from '@models/types.js';
import { ErrorClassifier } from '@utils/error-classifier.js';
import { InputValidator } from '@utils/input-validator.js';
import { logger } from '@utils/logger.js';
import { HealthChecker, BuiltinHealthChecks } from '@utils/health-checker.js';
import { EnvironmentValidator } from '@utils/environment-validator.js';
import { MemoryManagementProtocol } from '@utils/memory-management-protocol.js';

/**
 * Load and validate environment variables.
 * @returns The validated environment configuration.
 */
dotenv.config();

// Validate environment configuration
const envConfig = (() => {
  try {
    const config = EnvironmentValidator.getValidatedConfig();

    // Print configuration summary in development mode
    if (config.enableDevMode || config.nodeEnv === 'development') {
      console.log('\n🔧 Environment Configuration:');
      EnvironmentValidator.printConfigSummary(config);
      console.log('');
    }

    return config;
  } catch (error) {
    console.error('❌ Environment validation failed:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('\n💡 Please check your .env file and ensure all required variables are set.');
    console.error('📖 See .env.example for configuration options.');
    process.exit(1);
  }
})();

const GEMINI_API_KEY = envConfig.geminiApiKey;

/**
 * The main server instance.
 * @type {Server}
 */
const server = new Server(
  {
    name: envConfig.mcpServerName,
    version: envConfig.mcpServerVersion,
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Initialize multi-provider system with fallback support
let deepReasoner: DeepCodeReasonerV2 | null = null;
let apiManager: ApiManager | null = null;

if (GEMINI_API_KEY) {
  // Initialize primary reasoning service
  deepReasoner = new DeepCodeReasonerV2(GEMINI_API_KEY);
  
  // Initialize multi-provider API manager
  const providers: ApiProvider[] = [new GeminiService(GEMINI_API_KEY)];
  
  // Add OpenAI provider if API key is available
  if (envConfig.openaiApiKey) {
    providers.push(new OpenAIService({
      apiKey: envConfig.openaiApiKey,
      model: 'gpt-4-turbo-preview',
      maxTokens: 4000,
      temperature: 0.1,
      timeout: 30000
    }));
    logger.info('Multi-provider support enabled: Gemini + OpenAI');
  } else {
    logger.info('Single-provider mode: Gemini only (add OPENAI_API_KEY for multi-provider support)');
  }
  
  // Configure ApiManager for intelligent fallback
  const apiManagerConfig: ApiManagerConfig = {
    providers,
    retryAttempts: 3,
    timeoutMs: 30000,
    enableCaching: true
  };
  
  apiManager = new ApiManager(apiManagerConfig);
  
  logger.info('Deep Code Reasoning system initialized', {
    primaryProvider: 'gemini',
    fallbackProviders: providers.map(p => p.name),
    totalProviders: providers.length
  });
}

/**
 * The health checker instance.
 * @type {HealthChecker}
 */
const healthChecker = HealthChecker.getInstance();

// Register built-in health checks
healthChecker.registerCheck(BuiltinHealthChecks.memoryUsage());
healthChecker.registerCheck(BuiltinHealthChecks.systemStartup());
healthChecker.registerCheck(BuiltinHealthChecks.eventBus());

// Start health monitoring
healthChecker.start();

/**
 * The memory management protocol instance.
 * @type {MemoryManagementProtocol}
 */
const memoryProtocol = new MemoryManagementProtocol({
  thoughtsPerCheckpoint: 10,
  maxCheckpoints: 100,
  autoCheckpoint: true,
  enablePersistence: true,
});

// Initialize memory protocol
memoryProtocol.initialize().catch((error) => {
  logger.error('Failed to initialize Memory Management Protocol', error);
});

/**
 * Zod schema for the ClaudeCodeContext object.
 * @type {z.ZodObject}
 */
const ClaudeCodeContextSchema = z.object({
  attemptedApproaches: z.array(z.string()).describe('What VS Code already tried'),
  partialFindings: z.array(z.any()).describe('Any findings VS Code discovered'),
  stuckPoints: z.array(z.string()).describe('Description of where VS Code got stuck'),
  focusArea: z.object({
    files: z.array(z.string()).describe('Files to analyze'),
    entryPoints: z.array(z.any()).optional().describe('Specific functions/methods to start from'),
    serviceNames: z.array(z.string()).optional().describe('Services involved in cross-system analysis'),
  }).describe('The specific code scope for the analysis'),
  analysisBudgetRemaining: z.number().optional().describe('Remaining budget for the analysis'),
});

/**
 * Zod schema for the run_hypothesis_tournament tool (flat format).
 * @type {z.ZodObject}
 */
const RunHypothesisTournamentSchemaFlat = z.object({
  attempted_approaches: z.array(z.string()).describe('What VS Code already tried'),
  partial_findings: z.array(z.any()).describe('Any findings VS Code discovered'),
  stuck_description: z.array(z.string()).describe('Description of where VS Code got stuck'),
  code_scope: z.object({
    files: z.array(z.string()).describe('Files to analyze'),
    entryPoints: z.array(z.object({
      file: z.string(),
      line: z.number(),
      column: z.number().optional(),
      functionName: z.string().optional(),
    })).optional().describe('Specific functions/methods to start from'),
    serviceNames: z.array(z.string()).optional().describe('Services involved in cross-system analysis'),
  }).describe('The specific code scope for the analysis'),
  issue: z.string(),
  tournamentConfig: z.object({
    maxHypotheses: z.number().min(2).max(20).optional(),
    maxRounds: z.number().min(1).max(5).optional(),
    parallelSessions: z.number().min(1).max(10).optional(),
  }).optional(),
});

/**
 * Zod schema for the escalate_analysis tool (VS Code flat format).
 * @type {z.ZodObject}
 */
const EscalateAnalysisSchemaFlat = z.object({
  attempted_approaches: z.array(z.string()).describe('What VS Code already tried'),
  partial_findings: z.array(z.any()).describe('Any findings VS Code discovered'),
  stuck_description: z.array(z.string()).describe('Description of where VS Code got stuck'),
  code_scope: z.object({
    files: z.array(z.string()).describe('Files to analyze'),
    entryPoints: z.array(z.object({
      file: z.string(),
      line: z.number(),
      column: z.number().optional(),
      functionName: z.string().optional(),
    })).optional().describe('Specific functions/methods to start from'),
    serviceNames: z.array(z.string()).optional().describe('Services involved in cross-system analysis'),
  }).describe('The specific code scope for the analysis'),
  analysisType: z.enum(['execution_trace', 'cross_system', 'performance', 'hypothesis_test']),
  depthLevel: z.number().min(1).max(5),
  timeBudgetSeconds: z.number().default(60),
});

/**
 * Zod schema for the escalate_analysis tool (VS Code format).
 * @type {z.ZodObject}
 */
/**
 * Zod schema for the trace_execution_path tool.
 * @type {z.ZodObject}
 */
const TraceExecutionPathSchema = z.object({
  entryPoint: z.object({
    file: z.string(),
    line: z.number(),
    functionName: z.string().optional(),
  }),
  maxDepth: z.number().default(10),
  includeDataFlow: z.boolean().default(true),
});

/**
 * Zod schema for the hypothesis_test tool.
 * @type {z.ZodObject}
 */
const HypothesisTestSchema = z.object({
  hypothesis: z.string(),
  codeScope: z.object({
    files: z.array(z.string()),
    entryPoints: z.array(z.any()).optional(),
  }),
  testApproach: z.string(),
});

/**
 * Zod schema for the cross_system_impact tool.
 * @type {z.ZodObject}
 */
const CrossSystemImpactSchema = z.object({
  changeScope: z.object({
    files: z.array(z.string()),
    serviceNames: z.array(z.string()).optional(),
  }),
  impactTypes: z.array(z.enum(['breaking', 'performance', 'behavioral'])).optional(),
});

/**
 * Zod schema for the performance_bottleneck tool.
 * @type {z.ZodObject}
 */
const PerformanceBottleneckSchema = z.object({
  codePath: z.object({
    entryPoint: z.object({
      file: z.string(),
      line: z.number(),
      functionName: z.string().optional(),
    }),
    suspectedIssues: z.array(z.string()).optional(),
  }),
  profileDepth: z.number().min(1).max(5).default(3),
});

/**
 * Zod schema for the start_conversation tool.
 * @type {z.ZodObject}
 */
const StartConversationSchema = z.object({
  attempted_approaches: z.string(),
  partial_findings: z.string(),
  stuck_description: z.string(),
  code_scope_files: z.string(),
  code_scope_entry_points: z.string().optional(),
  code_scope_service_names: z.string().optional(),
  analysisType: z.enum(['execution_trace', 'cross_system', 'performance', 'hypothesis_test']),
  initialQuestion: z.string().optional(),
});

/**
 * Zod schema for the continue_conversation tool.
 * @type {z.ZodObject}
 */
const ContinueConversationSchema = z.object({
  sessionId: z.string(),
  message: z.string(),
  includeCodeSnippets: z.boolean().optional(),
});

/**
 * Zod schema for the finalize_conversation tool.
 * @type {z.ZodObject}
 */
const FinalizeConversationSchema = z.object({
  sessionId: z.string(),
  summaryFormat: z.enum(['detailed', 'concise', 'actionable']).optional(),
});

/**
 * Zod schema for the get_conversation_status tool.
 * @type {z.ZodObject}
 */
const GetConversationStatusSchema = z.object({
  sessionId: z.string(),
});

/**
 * Zod schema for the health_check tool.
 * @type {z.ZodObject}
 */
const HealthCheckSchema = z.object({
  check_name: z.string().optional(),
});

/**
 * Zod schema for the health_summary tool.
 * @type {z.ZodObject}
 */
const HealthSummarySchema = z.object({
  include_details: z.boolean().optional().default(true),
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'escalate_analysis',
        description: 'Hand off complex analysis to Gemini when VS Code hits reasoning limits. Gemini will perform deep semantic analysis beyond syntactic patterns.',
        inputSchema: {
          type: 'object',
          properties: {
            attempted_approaches: {
              type: 'array',
              items: { type: 'string' },
              description: 'What VS Code already tried',
            },
            partial_findings: {
              type: 'array',
              items: { type: 'object' },
              description: 'Any findings VS Code discovered',
            },
            stuck_description: {
              type: 'array',
              items: { type: 'string' },
              description: 'Description of where VS Code got stuck',
            },
            code_scope: {
              type: 'object',
              properties: {
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Files to analyze',
                },
                entryPoints: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      file: { type: 'string' },
                      line: { type: 'number' },
                      column: { type: 'number' },
                      functionName: { type: 'string' }
                    },
                    required: ['file', 'line']
                  },
                  description: 'Specific functions/methods to start from',
                },
                serviceNames: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Services involved in cross-system analysis',
                },
              },
              required: ['files'],
            },
            analysisType: {
              type: 'string',
              enum: ['execution_trace', 'cross_system', 'performance', 'hypothesis_test'],
              description: 'Type of deep analysis to perform',
            },
            depthLevel: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'How deep to analyze (1=shallow, 5=very deep)',
            },
            timeBudgetSeconds: {
              type: 'number',
              default: 60,
              description: 'Maximum time for analysis',
            },
          },
          required: ['attempted_approaches', 'partial_findings', 'stuck_description', 'code_scope', 'analysisType', 'depthLevel'],
        },
      },
      {
        name: 'trace_execution_path',
        description: 'Use Gemini to perform deep execution analysis with semantic understanding',
        inputSchema: {
          type: 'object',
          properties: {
            entryPoint: {
              type: 'object',
              properties: {
                file: { type: 'string' },
                line: { type: 'number' },
                functionName: { type: 'string' },
              },
              required: ['file', 'line'],
            },
            maxDepth: { type: 'number', default: 10 },
            includeDataFlow: { type: 'boolean', default: true },
          },
          required: ['entryPoint'],
        },
      },
      {
        name: 'hypothesis_test',
        description: 'Use Gemini to test specific theories about code behavior',
        inputSchema: {
          type: 'object',
          properties: {
            hypothesis: { type: 'string' },
            codeScope: {
              type: 'object',
              properties: {
                files: { type: 'array', items: { type: 'string' } },
                entryPoints: { type: 'array', items: { type: 'string' } },
              },
              required: ['files'],
            },
            testApproach: { type: 'string' },
          },
          required: ['hypothesis', 'codeScope', 'testApproach'],
        },
      },
      {
        name: 'cross_system_impact',
        description: 'Use Gemini to analyze changes across service boundaries',
        inputSchema: {
          type: 'object',
          properties: {
            changeScope: {
              type: 'object',
              properties: {
                files: { type: 'array', items: { type: 'string' } },
                serviceNames: { type: 'array', items: { type: 'string' } },
              },
              required: ['files'],
            },
            impactTypes: {
              type: 'array',
              items: { type: 'string', enum: ['breaking', 'performance', 'behavioral'] },
            },
          },
          required: ['changeScope'],
        },
      },
      {
        name: 'performance_bottleneck',
        description: 'Use Gemini for deep performance analysis with execution modeling',
        inputSchema: {
          type: 'object',
          properties: {
            codePath: {
              type: 'object',
              properties: {
                entryPoint: {
                  type: 'object',
                  properties: {
                    file: { type: 'string' },
                    line: { type: 'number' },
                    functionName: { type: 'string' },
                  },
                  required: ['file', 'line'],
                },
                suspectedIssues: { type: 'array', items: { type: 'string' } },
              },
              required: ['entryPoint'],
            },
            profileDepth: { type: 'number', minimum: 1, maximum: 5, default: 3 },
          },
          required: ['codePath'],
        },
      },
      {
        name: 'start_conversation',
        description: 'Start a conversational analysis session between Claude and Gemini',
        inputSchema: {
          type: 'object',
          properties: {
            attempted_approaches: {
              type: 'string',
              description: 'What VS Code already tried (JSON array as string)',
            },
            partial_findings: {
              type: 'string',
              description: 'Any findings VS Code discovered (JSON array as string)',
            },
            stuck_description: {
              type: 'string',
              description: 'Description of where VS Code got stuck (JSON array as string)',
            },
            code_scope_files: {
              type: 'string',
              description: 'Files to analyze (JSON array as string)',
            },
            code_scope_entry_points: {
              type: 'string',
              description: 'Entry points (JSON array as string, optional)',
            },
            code_scope_service_names: {
              type: 'string',
              description: 'Service names (JSON array as string, optional)',
            },
            analysisType: {
              type: 'string',
              enum: ['execution_trace', 'cross_system', 'performance', 'hypothesis_test'],
              description: 'Type of deep analysis to perform',
            },
            initialQuestion: {
              type: 'string',
              description: 'Initial question to start the conversation',
            },
          },
          required: ['attempted_approaches', 'partial_findings', 'stuck_description', 'code_scope_files', 'analysisType'],
        },
      },
      {
        name: 'continue_conversation',
        description: 'Continue an ongoing analysis conversation',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'ID of the conversation session',
            },
            message: {
              type: 'string',
              description: 'Claude\'s response or follow-up question',
            },
            includeCodeSnippets: {
              type: 'boolean',
              description: 'Whether to include code snippets in response',
            },
          },
          required: ['sessionId', 'message'],
        },
      },
      {
        name: 'finalize_conversation',
        description: 'Complete the conversation and get final analysis results',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'ID of the conversation session',
            },
            summaryFormat: {
              type: 'string',
              enum: ['detailed', 'concise', 'actionable'],
              description: 'Format for the final summary',
            },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'get_conversation_status',
        description: 'Check the status and progress of an ongoing conversation',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'ID of the conversation session',
            },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'run_hypothesis_tournament',
        description: 'Run a competitive hypothesis tournament to find root causes. Multiple AI conversations test different theories in parallel, with evidence-based scoring and elimination rounds.',
        inputSchema: {
          type: 'object',
          properties: {
            attempted_approaches: {
              type: 'array',
              items: { type: 'string' },
              description: 'What VS Code already tried',
            },
            partial_findings: {
              type: 'array',
              items: { type: 'object' },
              description: 'Any findings VS Code discovered',
            },
            stuck_description: {
              type: 'array',
              items: { type: 'string' },
              description: 'Description of where VS Code got stuck',
            },
            code_scope: {
              type: 'object',
              properties: {
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Files to analyze',
                },
                entryPoints: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      file: { type: 'string' },
                      line: { type: 'number' },
                      column: { type: 'number' },
                      functionName: { type: 'string' }
                    },
                    required: ['file', 'line']
                  },
                  description: 'Specific functions/methods to start from',
                },
                serviceNames: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Services involved in cross-system analysis',
                },
              },
              required: ['files'],
            },
            issue: {
              type: 'string',
              description: 'Description of the issue to investigate',
            },
            tournamentConfig: {
              type: 'object',
              properties: {
                maxHypotheses: {
                  type: 'number',
                  minimum: 2,
                  maximum: 20,
                  description: 'Number of initial hypotheses to generate (default: 6)',
                },
                maxRounds: {
                  type: 'number',
                  minimum: 1,
                  maximum: 5,
                  description: 'Maximum tournament rounds (default: 3)',
                },
                parallelSessions: {
                  type: 'number',
                  minimum: 1,
                  maximum: 10,
                  description: 'Max concurrent conversations (default: 4)',
                },
              },
            },
          },
          required: ['attempted_approaches', 'partial_findings', 'stuck_description', 'code_scope', 'issue'],
        },
      },
      {
        name: 'health_check',
        description: 'Execute a specific health check or all health checks',
        inputSchema: {
          type: 'object',
          properties: {
            check_name: {
              type: 'string',
              description: 'Name of specific health check to run. If omitted, runs all checks.',
            },
          },
        },
      },
      {
        name: 'health_summary',
        description: 'Get comprehensive health status of the MCP server',
        inputSchema: {
          type: 'object',
          properties: {
            include_details: {
              type: 'boolean',
              default: true,
              description: 'Include detailed check results in the summary',
            },
          },
        },
      },
      {
        name: 'get_model_info',
        description: 'Get current model configuration and available model options',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'set_model',
        description: 'Change the Gemini model used for analysis',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              enum: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
              description: 'The Gemini model to use for analysis',
            },
          },
          required: ['model'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    // Check if API key is configured
    if (!deepReasoner) {
      throw new McpError(
        ErrorCode.InternalError,
        'GEMINI_API_KEY is not configured. Please set the GEMINI_API_KEY environment variable.',
      );
    }

    switch (name) {
      case 'escalate_analysis': {
        const parsed = EscalateAnalysisSchemaFlat.parse(args);

        // Transform flat VS Code format to internal ClaudeCodeContext format
        const analysisContext: ClaudeCodeContext = {
          attemptedApproaches: parsed.attempted_approaches,
          partialFindings: parsed.partial_findings,
          stuckPoints: parsed.stuck_description,
          focusArea: {
            files: parsed.code_scope.files,
            entryPoints: parsed.code_scope.entryPoints || [],
            serviceNames: parsed.code_scope.serviceNames || [],
          },
          analysisBudgetRemaining: parsed.timeBudgetSeconds,
        };

        // Validate and sanitize the analysis context
        const validatedContext = InputValidator.validateClaudeContext(analysisContext);

        try {
          // Primary execution: Use DeepCodeReasonerV2
          const result = await deepReasoner.escalateFromClaudeCode(
            validatedContext,
            parsed.analysisType,
            parsed.depthLevel
          );

          // Log successful primary execution
          logger.debug('escalate_analysis succeeded with primary provider (DeepCodeReasonerV2)', {
            analysisType: parsed.analysisType,
            depthLevel: parsed.depthLevel,
            filesCount: validatedContext.focusArea.files.length
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (primaryError) {
          // Multi-provider fallback: Use ApiManager if available
          if (apiManager) {
            const classification = ErrorClassifier.classify(primaryError as Error);
            
            logger.warn('escalate_analysis failed with primary provider, attempting multi-provider fallback', {
              analysisType: parsed.analysisType,
              errorCategory: classification.category,
              isRetryable: classification.isRetryable
            });

            if (classification.isRetryable) {
              try {
                const fallbackResult = await apiManager.analyzeWithFallback(
                  validatedContext,
                  parsed.analysisType
                );

                // Convert ApiManager result to expected format
                const convertedResult = {
                  analysis: fallbackResult.result?.analysis || 'Analysis completed via multi-provider fallback',
                  confidence: fallbackResult.result?.confidence || 0.75,
                  strategy: `multi-provider-fallback-${fallbackResult.provider}`,
                  executionTime: fallbackResult.duration,
                  memoryUsed: fallbackResult.memoryUsed || 0,
                  metadata: {
                    provider: fallbackResult.provider,
                    cost: fallbackResult.cost,
                    fallbackUsed: true,
                    originalError: (primaryError as Error).message,
                    analysisType: parsed.analysisType
                  }
                };

                logger.info('escalate_analysis succeeded with multi-provider fallback', {
                  analysisType: parsed.analysisType,
                  fallbackProvider: fallbackResult.provider,
                  executionTime: fallbackResult.duration
                });

                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(convertedResult, null, 2),
                    },
                  ],
                };
              } catch (fallbackError) {
                logger.error('escalate_analysis failed with both primary and fallback providers', {
                  analysisType: parsed.analysisType,
                  primaryError: (primaryError as Error).message,
                  fallbackError: (fallbackError as Error).message
                });
                // Fall through to throw original error
              }
            }
          }
          
          // If no fallback available or fallback failed, throw original error
          throw primaryError;
        }
      }

      case 'trace_execution_path': {
        const parsed = TraceExecutionPathSchema.parse(args);

        // Validate the entry point file path
        const validatedPath = InputValidator.validateFilePaths([parsed.entryPoint.file])[0];
        if (!validatedPath) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Invalid entry point file path',
          );
        }

        const result = await deepReasoner.traceExecutionPath(
          { ...parsed.entryPoint, file: validatedPath },
          parsed.maxDepth,
          parsed.includeDataFlow,
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'hypothesis_test': {
        const parsed = HypothesisTestSchema.parse(args);

        // Validate file paths
        const validatedFiles = InputValidator.validateFilePaths(parsed.codeScope.files);
        if (validatedFiles.length === 0) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'No valid file paths provided',
          );
        }

        const result = await deepReasoner.testHypothesis(
          InputValidator.validateString(parsed.hypothesis, 2000),
          validatedFiles,
          InputValidator.validateString(parsed.testApproach, 1000),
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'cross_system_impact': {
        const parsed = CrossSystemImpactSchema.parse(args);

        // Validate file paths
        const validatedFiles = InputValidator.validateFilePaths(parsed.changeScope.files);
        if (validatedFiles.length === 0) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'No valid file paths provided',
          );
        }

        const result = await deepReasoner.analyzeCrossSystemImpact(
          validatedFiles,
          parsed.impactTypes,
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'performance_bottleneck': {
        const parsed = PerformanceBottleneckSchema.parse(args);

        // Validate the entry point file path
        const validatedPath = InputValidator.validateFilePaths([parsed.codePath.entryPoint.file])[0];
        if (!validatedPath) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Invalid entry point file path',
          );
        }

        const result = await deepReasoner.analyzePerformance(
          { ...parsed.codePath.entryPoint, file: validatedPath },
          parsed.profileDepth,
          parsed.codePath.suspectedIssues ?
            InputValidator.validateStringArray(parsed.codePath.suspectedIssues) :
            undefined,
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'start_conversation': {
        const parsed = StartConversationSchema.parse(args);
        
        // Parse JSON string fields back to arrays/objects
        const attempted_approaches = JSON.parse(parsed.attempted_approaches);
        const partial_findings = JSON.parse(parsed.partial_findings);
        const stuck_description = JSON.parse(parsed.stuck_description);
        const code_scope_files = JSON.parse(parsed.code_scope_files);
        const code_scope_entry_points = parsed.code_scope_entry_points ? JSON.parse(parsed.code_scope_entry_points) : [];
        const code_scope_service_names = parsed.code_scope_service_names ? JSON.parse(parsed.code_scope_service_names) : [];

        // Transform to ClaudeCodeContext format
        const context: ClaudeCodeContext = {
          attemptedApproaches: InputValidator.validateStringArray(attempted_approaches),
          partialFindings: partial_findings,
          stuckPoints: InputValidator.validateStringArray(stuck_description),
          focusArea: {
            files: InputValidator.validateFilePaths(code_scope_files),
            entryPoints: code_scope_entry_points,
            serviceNames: code_scope_service_names,
          },
          analysisBudgetRemaining: 300, // 5 minutes for conversational analysis
        };

        const result = await deepReasoner.startConversation(
          context,
          parsed.analysisType,
          parsed.initialQuestion,
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'continue_conversation': {
        const parsed = ContinueConversationSchema.parse(args);
        const result = await deepReasoner.continueConversation(
          parsed.sessionId,
          parsed.message,
          parsed.includeCodeSnippets,
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'finalize_conversation': {
        const parsed = FinalizeConversationSchema.parse(args);
        const result = await deepReasoner.finalizeConversation(
          parsed.sessionId,
          parsed.summaryFormat,
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_conversation_status': {
        const parsed = GetConversationStatusSchema.parse(args);
        const result = await deepReasoner.getConversationStatus(
          parsed.sessionId,
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'run_hypothesis_tournament': {
        const parsed = RunHypothesisTournamentSchemaFlat.parse(args);

        // Transform flat VS Code format to internal ClaudeCodeContext format
        const analysisContext: ClaudeCodeContext = {
          attemptedApproaches: parsed.attempted_approaches,
          partialFindings: parsed.partial_findings,
          stuckPoints: parsed.stuck_description,
          focusArea: {
            files: parsed.code_scope.files,
            entryPoints: parsed.code_scope.entryPoints || [],
            serviceNames: parsed.code_scope.serviceNames || [],
          },
          analysisBudgetRemaining: 300, // 5 minutes for tournament
        };

        // Validate and sanitize the analysis context
        const validatedContext = InputValidator.validateClaudeContext(analysisContext);

        const tournamentConfig = {
          maxHypotheses: parsed.tournamentConfig?.maxHypotheses ?? 6,
          maxRounds: parsed.tournamentConfig?.maxRounds ?? 3,
          parallelSessions: parsed.tournamentConfig?.parallelSessions ?? 4,
        };

        const result = await deepReasoner.runHypothesisTournament(
          validatedContext,
          InputValidator.validateString(parsed.issue, 1000),
          tournamentConfig,
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'health_check': {
        const parsed = HealthCheckSchema.parse(args);

        if (parsed.check_name) {
          // Execute specific health check
          const result = await healthChecker.executeCheck(parsed.check_name);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  check: result,
                  timestamp: new Date().toISOString(),
                }, null, 2),
              },
            ],
          };
        } else {
          // Execute all health checks
          const results = await healthChecker.executeAllChecks();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  checks: results,
                  totalChecks: results.length,
                  healthyChecks: results.filter(r => r.status === 'healthy').length,
                  timestamp: new Date().toISOString(),
                }, null, 2),
              },
            ],
          };
        }
      }

      case 'health_summary': {
        const parsed = HealthSummarySchema.parse(args);
        const summary = await healthChecker.getHealthSummary();

        if (!parsed.include_details) {
          // Return minimal summary without individual check details
          const minimalSummary = {
            status: summary.status,
            totalChecks: summary.totalChecks,
            timestamp: summary.timestamp,
            uptime: summary.uptime,
            version: summary.version,
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(minimalSummary, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      case 'get_model_info': {
        const currentModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const availableModels = [
          {
            name: 'gemini-2.5-pro',
            description: 'Highest quality, 5 RPM limit - best for single complex analysis',
            rateLimit: '5 requests/minute, 100 requests/day',
            qualityScore: '10/10',
          },
          {
            name: 'gemini-2.5-flash',
            description: 'Good quality, 10 RPM limit - best for multi-request workflows',
            rateLimit: '10 requests/minute, 250 requests/day',
            qualityScore: '8/10',
          },
          {
            name: 'gemini-2.0-flash',
            description: 'Acceptable quality, 15 RPM limit - best for high-volume analysis',
            rateLimit: '15 requests/minute, 200 requests/day',
            qualityScore: '7/10',
          },
        ];

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                currentModel,
                availableModels,
                recommendation: 'Use gemini-2.5-flash for balanced performance',
                toolRecommendations: {
                  singleAnalysis: 'gemini-2.5-pro',
                  conversations: 'gemini-2.5-flash',
                  tournaments: 'gemini-2.0-flash (with queuing)',
                },
              }, null, 2),
            },
          ],
        };
      }

      case 'set_model': {
        const parsed = z.object({
          model: z.enum(['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash']),
        }).parse(args);

        // Update environment variable (this affects current session only)
        process.env.GEMINI_MODEL = parsed.model;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                newModel: parsed.model,
                message: `Model changed to ${parsed.model} for current session. To persist this change, update your .env file: GEMINI_MODEL=${parsed.model}`,
                restartRequired: 'For permanent changes, restart the MCP server',
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`,
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      );
    }

    // Enhanced error handling using ErrorClassifier and structured formatting
    if (error instanceof Error) {
      const classification = ErrorClassifier.classify(error);

      // Log structured error information for debugging
      logger.error('Tool execution error', {
        tool: request.params.name,
        errorType: classification.category,
        errorMessage: error.message,
        isRetryable: classification.isRetryable,
        stack: error.stack?.substring(0, 500) // Limit stack trace length
      });

      switch (classification.category) {
        case 'session':
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Session error: ${classification.description}`,
          );

        case 'api':
          throw new McpError(
            ErrorCode.InternalError,
            `API error: ${classification.description}. ${classification.isRetryable ? 'The issue may be temporary - please try again.' : ''}`,
          );

        case 'filesystem':
          throw new McpError(
            ErrorCode.InvalidRequest,
            `File system error: ${classification.description}. Please check file paths and permissions.`,
          );

        default:
          console.error('Unhandled error in request handler:', error);
          throw new McpError(
            ErrorCode.InternalError,
            `Internal error: ${error.message}. Check server logs for details.`,
          );
      }
    }

    throw error;
  }
});

/**
 * The main function that starts the server.
 */
async function main() {
  logger.info('Starting Deep Code Reasoning MCP server...');

  const transport = new StdioServerTransport();
  logger.info('Connecting to transport...');

  await server.connect(transport);

  logger.info('Server connected successfully');
  logger.info(`GEMINI_API_KEY: ${GEMINI_API_KEY ? 'configured' : 'NOT CONFIGURED - server will return errors'}`);
  logger.info('Using Gemini model: gemini-2.5-pro-preview-05-06');
  logger.info('Ready to handle requests');

  // Setup graceful shutdown
  const shutdown = () => {
    logger.info('Received shutdown signal, stopping health monitoring...');
    healthChecker.stop();
    logger.info('Health monitoring stopped');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.error('Fatal error in main():', error);
  healthChecker.stop();
  process.exit(1);
});