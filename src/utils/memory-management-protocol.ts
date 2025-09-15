/**
 * @fileoverview Memory Management Protocol Implementation
 * @description Implements ABSOLUTE-RULE compliant memory management protocol
 * for systematic tracking of thoughts, decisions, and architectural knowledge
 */

import { Logger } from './logger.js';
import { EventBus } from './event-bus.js';
import { HealthChecker } from './health-checker.js';

/**
 * Memory entity types for classification
 */
export enum MemoryEntityType {
  THOUGHT = 'thought',
  DECISION = 'decision',
  ARCHITECTURE = 'architecture',
  ANALYSIS = 'analysis',
  REQUIREMENT = 'requirement',
  CONSTRAINT = 'constraint'
}

/**
 * Memory checkpoint configuration
 */
export interface MemoryCheckpointConfig {
  /** Number of thoughts between checkpoints */
  thoughtsPerCheckpoint: number;
  /** Maximum checkpoints to retain */
  maxCheckpoints: number;
  /** Enable automatic checkpointing */
  autoCheckpoint: boolean;
  /** Checkpoint persistence enabled */
  enablePersistence: boolean;
}

/**
 * Memory entity structure
 */
export interface MemoryEntity {
  /** Unique entity identifier */
  id: string;
  /** Entity type */
  type: MemoryEntityType;
  /** Entity content/observations */
  content: string[];
  /** Creation timestamp */
  timestamp: Date;
  /** Associated context */
  context?: string;
  /** Importance score (0-1) */
  importance: number;
  /** Related entity IDs */
  relatedEntities: string[];
}

/**
 * Memory checkpoint structure
 */
export interface MemoryCheckpoint {
  /** Checkpoint identifier */
  id: string;
  /** Checkpoint timestamp */
  timestamp: Date;
  /** Thought count at checkpoint */
  thoughtCount: number;
  /** Entities created since last checkpoint */
  entities: MemoryEntity[];
  /** Memory graph state */
  graphState: {
    nodeCount: number;
    edgeCount: number;
    entityTypes: Record<MemoryEntityType, number>;
  };
  /** Performance metrics */
  metrics: {
    processingTime: number;
    memoryUsage: number;
    entityCreationRate: number;
  };
}

/**
 * ABSOLUTE-RULE Memory Management Protocol
 * Implements systematic memory tracking and persistence
 */
export class MemoryManagementProtocol {
  private logger = new Logger('MemoryManagementProtocol');
  private eventBus = EventBus.getInstance();
  private entities = new Map<string, MemoryEntity>();
  private checkpoints: MemoryCheckpoint[] = [];
  private thoughtCounter = 0;
  private isInitialized = false;

  constructor(private config: MemoryCheckpointConfig) {
    this.logger.info('MemoryManagementProtocol initialized', {
      thoughtsPerCheckpoint: config.thoughtsPerCheckpoint,
      maxCheckpoints: config.maxCheckpoints,
      autoCheckpoint: config.autoCheckpoint,
    });
  }

  /**
   * Initialize the memory management protocol
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('MemoryManagementProtocol already initialized');
      return;
    }

    try {
      // Create initial checkpoint
      await this.createCheckpoint('initialization');

      // Register with health check system
      this.registerHealthChecks();

      this.isInitialized = true;
      this.logger.info('MemoryManagementProtocol initialized successfully');

      this.eventBus.publish({
        type: 'system:memory_status',
        timestamp: new Date(),
        component: 'MemoryManagementProtocol',
        level: 'info',
        message: 'Memory management protocol initialized',
        metadata: { config: this.config },
      });
    } catch (error) {
      this.logger.error('Failed to initialize MemoryManagementProtocol', error);
      throw error;
    }
  }

  /**
   * Record a thought in the memory system
   */
  async recordThought(
    content: string,
    type: MemoryEntityType = MemoryEntityType.THOUGHT,
    context?: string,
    importance: number = 0.5,
  ): Promise<string> {
    this.thoughtCounter++;

    const entity: MemoryEntity = {
      id: this.generateEntityId(),
      type,
      content: [content],
      timestamp: new Date(),
      context,
      importance,
      relatedEntities: [],
    };

    this.entities.set(entity.id, entity);

    // Check if checkpoint is needed
    if (this.config.autoCheckpoint &&
        this.thoughtCounter % this.config.thoughtsPerCheckpoint === 0) {
      await this.createCheckpoint(`thought_${this.thoughtCounter}`);
    }

    this.logger.debug('Thought recorded', {
      id: entity.id,
      type: entity.type,
      thoughtCount: this.thoughtCounter,
    });

    this.eventBus.publish({
      type: 'system:memory_status',
      timestamp: new Date(),
      component: 'MemoryManagementProtocol',
      level: 'info',
      message: 'Thought recorded in memory system',
      metadata: {
        entityId: entity.id,
        type: entity.type,
        thoughtCount: this.thoughtCounter,
      },
    });

    return entity.id;
  }

  /**
   * Add observation to existing entity
   */
  async addObservation(entityId: string, observation: string): Promise<void> {
    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    entity.content.push(observation);
    entity.timestamp = new Date();

    this.logger.debug('Observation added to entity', {
      entityId,
      observationCount: entity.content.length,
    });
  }

  /**
   * Create relationship between entities
   */
  async createRelationship(fromEntityId: string, toEntityId: string, relationType: string): Promise<void> {
    const fromEntity = this.entities.get(fromEntityId);
    const toEntity = this.entities.get(toEntityId);

    if (!fromEntity || !toEntity) {
      throw new Error(`Entity not found: ${!fromEntity ? fromEntityId : toEntityId}`);
    }

    if (!fromEntity.relatedEntities.includes(toEntityId)) {
      fromEntity.relatedEntities.push(toEntityId);
    }

    this.logger.debug('Entity relationship created', {
      from: fromEntityId,
      to: toEntityId,
      type: relationType,
    });

    // TODO: Integrate with MCP memory tools for persistent storage
    // This would call mcp_memory_create_relations
  }

  /**
   * Create memory checkpoint
   */
  private async createCheckpoint(reason: string): Promise<void> {
    const checkpoint: MemoryCheckpoint = {
      id: this.generateCheckpointId(),
      timestamp: new Date(),
      thoughtCount: this.thoughtCounter,
      entities: Array.from(this.entities.values()),
      graphState: this.calculateGraphState(),
      metrics: await this.collectMetrics(),
    };

    this.checkpoints.push(checkpoint);

    // Maintain max checkpoints
    if (this.checkpoints.length > this.config.maxCheckpoints) {
      this.checkpoints.shift();
    }

    // Persist checkpoint if enabled
    if (this.config.enablePersistence) {
      await this.persistCheckpoint(checkpoint);
    }

    this.logger.info('Memory checkpoint created', {
      id: checkpoint.id,
      reason,
      thoughtCount: this.thoughtCounter,
      entityCount: checkpoint.entities.length,
    });

    this.eventBus.publish({
      type: 'system:memory_status',
      timestamp: new Date(),
      component: 'MemoryManagementProtocol',
      level: 'info',
      message: 'Memory checkpoint created',
      metadata: {
        checkpointId: checkpoint.id,
        reason,
        entityCount: checkpoint.entities.length,
      },
    });
  }

  /**
   * Calculate current memory graph state
   */
  private calculateGraphState() {
    const entityTypes = Object.values(MemoryEntityType).reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {} as Record<MemoryEntityType, number>);

    let totalRelations = 0;

    for (const entity of Array.from(this.entities.values())) {
      entityTypes[entity.type]++;
      totalRelations += entity.relatedEntities.length;
    }

    return {
      nodeCount: this.entities.size,
      edgeCount: totalRelations,
      entityTypes,
    };
  }

  /**
   * Collect performance metrics
   */
  private async collectMetrics(): Promise<MemoryCheckpoint['metrics']> {
    const startTime = process.hrtime.bigint();

    // Simulate processing time measurement
    await new Promise(resolve => setTimeout(resolve, 1));

    const endTime = process.hrtime.bigint();
    const processingTime = Number(endTime - startTime) / 1e6; // Convert to milliseconds

    const memUsage = process.memoryUsage();

    return {
      processingTime,
      memoryUsage: memUsage.heapUsed,
      entityCreationRate: this.thoughtCounter / (Date.now() / 1000), // entities per second
    };
  }

  /**
   * Persist checkpoint using MCP memory tools
   * This method should be called by external MCP memory integration
   */
  async persistCheckpoint(checkpoint: MemoryCheckpoint): Promise<void> {
    // TODO: Implement persistence using MCP memory tools
    // This would create entities and relations in the persistent memory graph
    // Example integration:
    // 1. Create entities for each checkpoint entity
    // 2. Create relations between entities
    // 3. Store checkpoint metadata

    this.logger.info('Checkpoint persistence requested', {
      checkpointId: checkpoint.id,
      entityCount: checkpoint.entities.length,
    });

    // For now, log the data that would be persisted
    this.logger.debug('Checkpoint data for persistence', {
      checkpoint,
    });
  }

  /**
   * Get data for MCP memory tool integration
   * Returns entities and relations ready for mcp_memory_create_entities and mcp_memory_create_relations
   */
  getPersistenceData(): {
    entities: Array<{
      entityType: string;
      name: string;
      observations: string[];
    }>;
    relations: Array<{
      from: string;
      to: string;
      relationType: string;
    }>;
    } {
    const entities = Array.from(this.entities.values()).map(entity => ({
      entityType: entity.type,
      name: entity.id,
      observations: entity.content,
    }));

    const relations: Array<{
      from: string;
      to: string;
      relationType: string;
    }> = [];

    for (const entity of Array.from(this.entities.values())) {
      for (const relatedId of entity.relatedEntities) {
        relations.push({
          from: entity.id,
          to: relatedId,
          relationType: 'related_to',
        });
      }
    }

    return { entities, relations };
  }

  /**
   * Register health check validations
   */
  private registerHealthChecks(): void {
    const healthChecker = HealthChecker.getInstance();

    healthChecker.registerCheck({
      name: 'memory_graph_validation',
      type: 'functional',
      enabled: true,
      timeout: 5000, // 5 seconds
      interval: 300000, // Every 5 minutes
      checkFn: async () => {
        const isValid = await this.validateGraph();
        const stats = this.getStats();

        return {
          name: 'memory_graph_validation',
          type: 'functional',
          status: isValid ? 'healthy' : 'degraded',
          message: isValid
            ? `Memory graph healthy: ${stats.entityCount} entities, ${stats.graphState.nodeCount} nodes`
            : 'Memory graph validation failed',
          metadata: {
            entityCount: stats.entityCount,
            graphState: stats.graphState,
            lastCheckpoint: stats.lastCheckpoint,
          },
        };
      },
    });

    this.logger.info('Memory graph validation health check registered');
  }

  /**
   * Generate unique entity ID
   */
  private generateEntityId(): string {
    return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique checkpoint ID
   */
  private generateCheckpointId(): string {
    return `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current memory statistics
   */
  getStats() {
    return {
      thoughtCount: this.thoughtCounter,
      entityCount: this.entities.size,
      checkpointCount: this.checkpoints.length,
      graphState: this.calculateGraphState(),
      lastCheckpoint: this.checkpoints[this.checkpoints.length - 1]?.timestamp,
    };
  }

  /**
   * Validate memory graph integrity
   */
  async validateGraph(): Promise<boolean> {
    try {
      // Check for orphaned entities (entities with invalid relations)
      for (const entity of Array.from(this.entities.values())) {
        for (const relatedId of entity.relatedEntities) {
          if (!this.entities.has(relatedId)) {
            this.logger.warn('Orphaned entity relation detected', {
              entityId: entity.id,
              invalidRelation: relatedId,
            });
            return false;
          }
        }
      }

      // Check checkpoint integrity
      if (this.checkpoints.length > 0) {
        const latestCheckpoint = this.checkpoints[this.checkpoints.length - 1];
        if (latestCheckpoint.thoughtCount !== this.thoughtCounter) {
          this.logger.warn('Checkpoint thought count mismatch', {
            checkpointCount: latestCheckpoint.thoughtCount,
            currentCount: this.thoughtCounter,
          });
          return false;
        }
      }

      // Check entity ID uniqueness
      const entityIds = new Set(this.entities.keys());
      if (entityIds.size !== this.entities.size) {
        this.logger.error('Duplicate entity IDs detected');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Graph validation failed', error);
      return false;
    }
  }
}
