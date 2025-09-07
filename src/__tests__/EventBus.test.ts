/**
 * @fileoverview Tests for EventBus observer pattern implementation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  EventBus, 
  EventFactory, 
  EventPublisher,
  AnalysisProgressEvent,
  SystemEvent,
  EventType 
} from '../../src/utils/EventBus.js';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = EventBus.getInstance();
    eventBus.clear(); // Clear any existing subscriptions
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('Subscription Management', () => {
    it('should allow subscribing to specific event types', () => {
      const handler = jest.fn();
      const subscription = eventBus.subscribe('analysis:started', handler as any);
      
      expect(subscription.id).toMatch(/^sub_\d+$/);
      expect(subscription.eventType).toBe('analysis:started');
      expect(eventBus.getSubscriptionCount()).toBe(1);
      expect(eventBus.getHandlerCount('analysis:started')).toBe(1);
    });

    it('should allow subscribing to all events with wildcard', () => {
      const handler = jest.fn();
      const subscription = eventBus.subscribe('*', handler as any);
      
      expect(subscription.eventType).toBe('*');
      expect(eventBus.getSubscriptionCount()).toBe(1);
      expect(eventBus.getHandlerCount('*')).toBe(1);
    });

    it('should allow unsubscribing', () => {
      const handler = jest.fn();
      const subscription = eventBus.subscribe('analysis:started', handler as any);
      
      expect(eventBus.getSubscriptionCount()).toBe(1);
      
      subscription.unsubscribe();
      
      expect(eventBus.getSubscriptionCount()).toBe(0);
    });

    it('should handle multiple subscriptions', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      eventBus.subscribe('analysis:started', handler1 as any);
      eventBus.subscribe('analysis:progress', handler2 as any);
      
      expect(eventBus.getSubscriptionCount()).toBe(2);
      expect(eventBus.getHandlerCount('analysis:started')).toBe(1);
      expect(eventBus.getHandlerCount('analysis:progress')).toBe(1);
    });
  });

  describe('Event Publishing', () => {
    it('should publish events to specific subscribers', async () => {
      const handler = jest.fn();
      eventBus.subscribe('analysis:started', handler as any);
      
      const event = EventFactory.createAnalysisEvent(
        'analysis:started',
        'test-analysis',
        'initialization',
        0,
        'Starting analysis'
      );
      
      await eventBus.publish(event);
      
      expect(handler).toHaveBeenCalledWith(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should publish events to wildcard subscribers', async () => {
      const wildcardHandler = jest.fn();
      const specificHandler = jest.fn();
      
      eventBus.subscribe('*', wildcardHandler as any);
      eventBus.subscribe('analysis:started', specificHandler as any);
      
      const event = EventFactory.createAnalysisEvent(
        'analysis:started',
        'test-analysis',
        'initialization',
        0
      );
      
      await eventBus.publish(event);
      
      expect(wildcardHandler).toHaveBeenCalledWith(event);
      expect(specificHandler).toHaveBeenCalledWith(event);
    });

    it('should not call handlers for unmatched event types', async () => {
      const handler = jest.fn();
      eventBus.subscribe('analysis:started', handler as any);
      
      const event = EventFactory.createAnalysisEvent(
        'analysis:completed',
        'test-analysis',
        'finalization',
        100
      );
      
      await eventBus.publish(event);
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle handler errors gracefully', async () => {
      const errorHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const goodHandler = jest.fn();
      
      eventBus.subscribe('analysis:started', errorHandler as any);
      eventBus.subscribe('analysis:started', goodHandler as any);
      
      const event = EventFactory.createAnalysisEvent(
        'analysis:started',
        'test-analysis',
        'initialization',
        0
      );
      
      // Should not throw despite error in one handler
      await expect(eventBus.publish(event)).resolves.toBeUndefined();
      
      expect(errorHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
    });

    it('should handle async handlers', async () => {
      const asyncHandler = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      eventBus.subscribe('analysis:started', asyncHandler as any);
      
      const event = EventFactory.createAnalysisEvent(
        'analysis:started',
        'test-analysis',
        'initialization',
        0
      );
      
      await eventBus.publish(event);
      
      expect(asyncHandler).toHaveBeenCalledWith(event);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = EventBus.getInstance();
      const instance2 = EventBus.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain subscriptions across getInstance calls', () => {
      const instance1 = EventBus.getInstance();
      const handler = jest.fn();
      instance1.subscribe('analysis:started', handler as any);
      
      const instance2 = EventBus.getInstance();
      expect(instance2.getSubscriptionCount()).toBe(1);
    });
  });
});

describe('EventFactory', () => {
  describe('Analysis Events', () => {
    it('should create analysis progress events', () => {
      const event = EventFactory.createAnalysisEvent(
        'analysis:progress',
        'test-analysis',
        'processing',
        50,
        'Halfway complete',
        { filesProcessed: 5 }
      );
      
      expect(event.type).toBe('analysis:progress');
      expect(event.analysisId).toBe('test-analysis');
      expect(event.stage).toBe('processing');
      expect(event.progress).toBe(50);
      expect(event.message).toBe('Halfway complete');
      expect(event.details).toEqual({ filesProcessed: 5 });
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.correlationId).toMatch(/^evt_\d+_[a-z0-9]{9}$/);
    });

    it('should clamp progress values', () => {
      const negativeEvent = EventFactory.createAnalysisEvent(
        'analysis:progress',
        'test',
        'test',
        -10
      );
      expect(negativeEvent.progress).toBe(0);
      
      const overEvent = EventFactory.createAnalysisEvent(
        'analysis:progress',
        'test',
        'test',
        150
      );
      expect(overEvent.progress).toBe(100);
    });

    it('should accept custom correlation IDs', () => {
      const customCorrelationId = 'custom-correlation-123';
      const event = EventFactory.createAnalysisEvent(
        'analysis:started',
        'test-analysis',
        'init',
        0,
        undefined,
        undefined,
        customCorrelationId
      );
      
      expect(event.correlationId).toBe(customCorrelationId);
    });
  });

  describe('System Events', () => {
    it('should create system events', () => {
      const event = EventFactory.createSystemEvent(
        'system:health_check',
        'database',
        'info',
        'Database connection healthy',
        { responseTime: 45 }
      );
      
      expect(event.type).toBe('system:health_check');
      expect(event.component).toBe('database');
      expect(event.level).toBe('info');
      expect(event.message).toBe('Database connection healthy');
      expect(event.metadata).toEqual({ responseTime: 45 });
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.correlationId).toMatch(/^evt_\d+_[a-z0-9]{9}$/);
    });
  });
});

describe('EventPublisher', () => {
  let eventBus: EventBus;
  let eventPublisher: EventPublisher;
  let mockHandler: jest.Mock;

  beforeEach(() => {
    eventBus = EventBus.getInstance();
    eventBus.clear();
    eventPublisher = new EventPublisher(eventBus);
    mockHandler = jest.fn();
  });

  afterEach(() => {
    eventBus.clear();
  });

  it('should publish analysis started events', async () => {
    eventBus.subscribe('analysis:started', mockHandler as any);
    
    await eventPublisher.publishAnalysisStarted('test-analysis', 'initialization');
    
    expect(mockHandler).toHaveBeenCalledTimes(1);
    const event = mockHandler.mock.calls[0][0] as AnalysisProgressEvent;
    expect(event.type).toBe('analysis:started');
    expect(event.analysisId).toBe('test-analysis');
    expect(event.stage).toBe('initialization');
    expect(event.progress).toBe(0);
  });

  it('should publish analysis progress events', async () => {
    eventBus.subscribe('analysis:progress', mockHandler as any);
    
    await eventPublisher.publishAnalysisProgress(
      'test-analysis',
      'processing',
      75,
      'Almost done',
      { filesProcessed: 15 }
    );
    
    expect(mockHandler).toHaveBeenCalledTimes(1);
    const event = mockHandler.mock.calls[0][0] as AnalysisProgressEvent;
    expect(event.type).toBe('analysis:progress');
    expect(event.progress).toBe(75);
    expect(event.message).toBe('Almost done');
    expect(event.details).toEqual({ filesProcessed: 15 });
  });

  it('should publish analysis completed events', async () => {
    eventBus.subscribe('analysis:completed', mockHandler as any);
    
    await eventPublisher.publishAnalysisCompleted(
      'test-analysis',
      'finalization',
      { totalFiles: 20, errors: 0 }
    );
    
    expect(mockHandler).toHaveBeenCalledTimes(1);
    const event = mockHandler.mock.calls[0][0] as AnalysisProgressEvent;
    expect(event.type).toBe('analysis:completed');
    expect(event.progress).toBe(100);
    expect(event.details).toEqual({ totalFiles: 20, errors: 0 });
  });

  it('should publish analysis failed events', async () => {
    eventBus.subscribe('analysis:failed', mockHandler as any);
    
    const error = new Error('Test error');
    await eventPublisher.publishAnalysisFailed('test-analysis', 'processing', error);
    
    expect(mockHandler).toHaveBeenCalledTimes(1);
    const event = mockHandler.mock.calls[0][0] as AnalysisProgressEvent;
    expect(event.type).toBe('analysis:failed');
    expect(event.progress).toBe(0);
    expect(event.details?.error).toBe('Test error');
  });

  it('should publish system health check events', async () => {
    eventBus.subscribe('system:health_check', mockHandler as any);
    
    await eventPublisher.publishSystemHealthCheck(
      'api',
      'healthy',
      { responseTime: 100 }
    );
    
    expect(mockHandler).toHaveBeenCalledTimes(1);
    const event = mockHandler.mock.calls[0][0] as SystemEvent;
    expect(event.type).toBe('system:health_check');
    expect(event.component).toBe('api');
    expect(event.level).toBe('info');
    expect(event.metadata).toEqual({ responseTime: 100 });
  });

  it('should use correlation IDs when provided', async () => {
    eventBus.subscribe('*', mockHandler as any);
    
    const correlationId = 'test-correlation-123';
    await eventPublisher.publishAnalysisStarted('test-analysis', 'init', correlationId);
    
    const event = mockHandler.mock.calls[0][0] as AnalysisProgressEvent;
    expect(event.correlationId).toBe(correlationId);
  });
});
