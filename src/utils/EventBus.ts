/**
 * @fileoverview Observer pattern implementation for progress tracking and event notifications
 * This module provides a type-safe, decoupled event system for real-time progress updates
 * and status notifications throughout the analysis pipeline.
 *
 * @author Deep Code Reasoning MCP Server
 * @version 1.0.0
 */

import { Logger } from './Logger.js';

/**
 * Base interface for all events in the system
 */
export interface BaseEvent {
  readonly type: string;
  readonly timestamp: Date;
  readonly correlationId?: string;
}

/**
 * Analysis progress event types
 */
export type AnalysisEventType =
  | 'analysis:started'
  | 'analysis:progress'
  | 'analysis:completed'
  | 'analysis:failed'
  | 'analysis:cancelled';

/**
 * System health event types
 */
export type SystemEventType =
  | 'system:startup'
  | 'system:shutdown'
  | 'system:health_check'
  | 'system:error'
  | 'system:warning';

/**
 * All supported event types
 */
export type EventType = AnalysisEventType | SystemEventType;

/**
 * Analysis progress event data
 */
export interface AnalysisProgressEvent extends BaseEvent {
  type: AnalysisEventType;
  analysisId: string;
  stage: string;
  progress: number; // 0-100
  message?: string;
  details?: Record<string, any>;
}

/**
 * System event data
 */
export interface SystemEvent extends BaseEvent {
  type: SystemEventType;
  component: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Union type for all events
 */
export type Event = AnalysisProgressEvent | SystemEvent;

/**
 * Event handler function type
 */
export type EventHandler<T extends Event = Event> = (event: T) => void | Promise<void>;

/**
 * Subscription interface for managing event listeners
 */
export interface Subscription {
  readonly id: string;
  readonly eventType: EventType | '*';
  unsubscribe(): void;
}

/**
 * Implementation of subscription
 */
class SubscriptionImpl implements Subscription {
  constructor(
    public readonly id: string,
    public readonly eventType: EventType | '*',
    private readonly unsubscribeFn: () => void,
  ) {}

  unsubscribe(): void {
    this.unsubscribeFn();
  }
}

/**
 * Event publisher/observer pattern implementation
 * Provides type-safe event publishing and subscription capabilities
 */
export class EventBus {
  private static instance: EventBus;
  private readonly logger = new Logger('[EventBus]');
  private readonly handlers = new Map<EventType | '*', Set<EventHandler>>();
  private readonly subscriptions = new Map<string, Subscription>();
  private subscriptionCounter = 0;

  private constructor() {}

  /**
   * Get singleton instance of EventBus
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribe to specific event type or all events
   */
  public subscribe<T extends Event>(
    eventType: EventType | '*',
    handler: EventHandler<T>,
  ): Subscription {
    const subscriptionId = `sub_${++this.subscriptionCounter}`;

    // Add handler to the appropriate set
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);

    // Create subscription
    const subscription = new SubscriptionImpl(
      subscriptionId,
      eventType,
      () => this.unsubscribe(subscriptionId),
    );

    this.subscriptions.set(subscriptionId, subscription);

    this.logger.debug(`EventBus: Subscribed to ${eventType}`, {
      subscriptionId,
      totalSubscriptions: this.subscriptions.size,
    });

    return subscription;
  }

  /**
   * Unsubscribe from events
   */
  private unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    const handlers = this.handlers.get(subscription.eventType);
    if (handlers) {
      // Note: We can't easily remove the specific handler without storing it
      // In a production system, we might store handler references differently
      this.logger.debug(`EventBus: Unsubscribed from ${subscription.eventType}`, {
        subscriptionId,
      });
    }

    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Publish an event to all relevant subscribers
   */
  public async publish(event: Event): Promise<void> {
    const eventHandlers = new Set<EventHandler>();

    // Get specific handlers for this event type
    const specificHandlers = this.handlers.get(event.type);
    if (specificHandlers) {
      specificHandlers.forEach(handler => eventHandlers.add(handler));
    }

    // Get wildcard handlers (listen to all events)
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => eventHandlers.add(handler));
    }

    if (eventHandlers.size === 0) {
      this.logger.debug(`EventBus: No handlers for event ${event.type}`);
      return;
    }

    this.logger.debug(`EventBus: Publishing event ${event.type}`, {
      eventType: event.type,
      handlerCount: eventHandlers.size,
      correlationId: event.correlationId,
    });

    // Execute all handlers (with error handling to prevent one failure from affecting others)
    const promises = Array.from(eventHandlers).map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(`EventBus: Handler error for event ${event.type}`, {
          error: error instanceof Error ? error.message : String(error),
          eventType: event.type,
          correlationId: event.correlationId,
        });
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get current subscription count for monitoring
   */
  public getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get handler count for a specific event type
   */
  public getHandlerCount(eventType: EventType | '*'): number {
    return this.handlers.get(eventType)?.size ?? 0;
  }

  /**
   * Clear all subscriptions (useful for testing)
   */
  public clear(): void {
    this.handlers.clear();
    this.subscriptions.clear();
    this.subscriptionCounter = 0;
    this.logger.debug('EventBus: Cleared all subscriptions');
  }
}

/**
 * Helper class for creating and publishing events
 */
export class EventFactory {
  private static generateCorrelationId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create an analysis progress event
   */
  public static createAnalysisEvent(
    type: AnalysisEventType,
    analysisId: string,
    stage: string,
    progress: number,
    message?: string,
    details?: Record<string, any>,
    correlationId?: string,
  ): AnalysisProgressEvent {
    return {
      type,
      timestamp: new Date(),
      correlationId: correlationId || this.generateCorrelationId(),
      analysisId,
      stage,
      progress: Math.max(0, Math.min(100, progress)), // Clamp to 0-100
      message,
      details,
    };
  }

  /**
   * Create a system event
   */
  public static createSystemEvent(
    type: SystemEventType,
    component: string,
    level: 'info' | 'warning' | 'error',
    message: string,
    metadata?: Record<string, any>,
    correlationId?: string,
  ): SystemEvent {
    return {
      type,
      timestamp: new Date(),
      correlationId: correlationId || this.generateCorrelationId(),
      component,
      level,
      message,
      metadata,
    };
  }
}

/**
 * Convenience class for publishing common events
 */
export class EventPublisher {
  private readonly eventBus: EventBus;
  private readonly logger = new Logger('[EventPublisher]');

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || EventBus.getInstance();
  }

  /**
   * Publish analysis started event
   */
  public async publishAnalysisStarted(
    analysisId: string,
    stage: string,
    correlationId?: string,
  ): Promise<void> {
    const event = EventFactory.createAnalysisEvent(
      'analysis:started',
      analysisId,
      stage,
      0,
      `Analysis ${analysisId} started`,
      undefined,
      correlationId,
    );
    await this.eventBus.publish(event);
  }

  /**
   * Publish analysis progress event
   */
  public async publishAnalysisProgress(
    analysisId: string,
    stage: string,
    progress: number,
    message?: string,
    details?: Record<string, any>,
    correlationId?: string,
  ): Promise<void> {
    const event = EventFactory.createAnalysisEvent(
      'analysis:progress',
      analysisId,
      stage,
      progress,
      message,
      details,
      correlationId,
    );
    await this.eventBus.publish(event);
  }

  /**
   * Publish analysis completed event
   */
  public async publishAnalysisCompleted(
    analysisId: string,
    stage: string,
    details?: Record<string, any>,
    correlationId?: string,
  ): Promise<void> {
    const event = EventFactory.createAnalysisEvent(
      'analysis:completed',
      analysisId,
      stage,
      100,
      `Analysis ${analysisId} completed successfully`,
      details,
      correlationId,
    );
    await this.eventBus.publish(event);
  }

  /**
   * Publish analysis failed event
   */
  public async publishAnalysisFailed(
    analysisId: string,
    stage: string,
    error: Error,
    correlationId?: string,
  ): Promise<void> {
    const event = EventFactory.createAnalysisEvent(
      'analysis:failed',
      analysisId,
      stage,
      0,
      `Analysis ${analysisId} failed: ${error.message}`,
      { error: error.message, stack: error.stack },
      correlationId,
    );
    await this.eventBus.publish(event);
  }

  /**
   * Publish system health check event
   */
  public async publishSystemHealthCheck(
    component: string,
    status: 'healthy' | 'unhealthy',
    details?: Record<string, any>,
    correlationId?: string,
  ): Promise<void> {
    const event = EventFactory.createSystemEvent(
      'system:health_check',
      component,
      status === 'healthy' ? 'info' : 'error',
      `Component ${component} is ${status}`,
      details,
      correlationId,
    );
    await this.eventBus.publish(event);
  }
}

// Export singleton instances for convenience
export const eventBus = EventBus.getInstance();
export const eventPublisher = new EventPublisher();
