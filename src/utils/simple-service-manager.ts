/**
 * @fileoverview Simple Service Management for Personal Use
 * @description Lightweight service instantiation and management without complex DI frameworks
 */

import { SimpleCache, AnalysisResultCache, FileContentCache } from '../cache/simple-cache.js';
import { GeminiService } from '../services/gemini-service.js';
import { ConversationManager } from '../services/conversation-manager.js';
import { logger } from './logger.js';

/**
 * Simple service configuration for personal use
 */
export interface SimpleServiceConfig {
  /** Enable development mode with extra logging */
  devMode?: boolean;
  /** Gemini API key for AI services */
  geminiApiKey?: string;
  /** Cache configuration */
  cache?: {
    defaultTtl?: number;
    maxSize?: number;
  };
}

/**
 * Simple Service Manager for Personal Use
 * Uses "Poor Man's Dependency Injection" - manual, explicit service creation
 *
 * This replaces the complex 1,105-line ServiceFactory + ServiceContainer infrastructure
 * with a simple, straightforward approach suitable for personal projects.
 */
export class SimpleServiceManager {
  private services = new Map<string, any>();
  private config: SimpleServiceConfig;

  constructor(config: SimpleServiceConfig = {}) {
    this.config = {
      devMode: false,
      ...config,
    };

    if (this.config.devMode) {
      logger.info('SimpleServiceManager initialized in dev mode');
    }
  }

  /**
   * Get or create a service instance
   */
  get<T>(serviceName: string): T {
    if (this.services.has(serviceName)) {
      return this.services.get(serviceName);
    }

    const service = this.createService<T>(serviceName);
    this.services.set(serviceName, service);
    return service;
  }

  /**
   * Check if a service exists
   */
  has(serviceName: string): boolean {
    return this.services.has(serviceName);
  }

  /**
   * Clear all services (for testing)
   */
  clear(): void {
    this.services.clear();
  }

  /**
   * Create service instances using simple factory pattern
   */
  private createService<T>(serviceName: string): T {
    switch (serviceName) {
      case 'analysisCache':
        return new SimpleCache({
          defaultTtl: this.config.cache?.defaultTtl ?? 5 * 60 * 1000, // 5 minutes
          maxSize: this.config.cache?.maxSize ?? 1000,
        }) as T;

      case 'analysisResultCache':
        return new AnalysisResultCache({
          defaultTtl: this.config.cache?.defaultTtl ?? 10 * 60 * 1000, // 10 minutes
          maxSize: this.config.cache?.maxSize ?? 500,
        }) as T;

      case 'fileContentCache':
        return new FileContentCache({
          defaultTtl: this.config.cache?.defaultTtl ?? 5 * 60 * 1000, // 5 minutes
          maxSize: this.config.cache?.maxSize ?? 200,
        }) as T;

      case 'geminiService':
        if (!this.config.geminiApiKey) {
          throw new Error('Gemini API key is required for GeminiService');
        }
        return new GeminiService(this.config.geminiApiKey) as T;

      case 'conversationManager':
        return new ConversationManager() as T;

      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }
  }

  /**
   * Get service statistics for monitoring
   */
  getStats() {
    return {
      serviceCount: this.services.size,
      services: Array.from(this.services.keys()),
      config: this.config,
    };
  }
}

/**
 * Global service manager instance for convenience
 * For personal use, a singleton is often sufficient
 */
let globalServiceManager: SimpleServiceManager | null = null;

/**
 * Get the global service manager instance
 */
export function getServiceManager(config?: SimpleServiceConfig): SimpleServiceManager {
  if (!globalServiceManager) {
    globalServiceManager = new SimpleServiceManager(config);
  }
  return globalServiceManager;
}

/**
 * Reset the global service manager (for testing)
 */
export function resetServiceManager(): void {
  globalServiceManager = null;
}
