import type { IFileSystemReader } from '@utils/FileSystemAbstraction.js';
import { EnhancedFileSystemReader } from '@utils/FileSystemAbstraction.js';
import { ErrorBoundary } from '@utils/ErrorBoundary.js';
import { logger } from '@utils/Logger.js';

/**
 * Service identifier keys for dependency injection
 */
export const SERVICE_KEYS = {
  FILE_SYSTEM_READER: 'fileSystemReader',
  ERROR_BOUNDARY: 'errorBoundary',
  LOGGER: 'logger',
} as const;

export type ServiceKey = keyof typeof SERVICE_KEYS;

/**
 * Service container for dependency injection
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();
  private factories: Map<string, () => any> = new Map();

  private constructor() {
    this.registerDefaultServices();
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Register a service instance
   */
  public register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  /**
   * Register a factory function for lazy service creation
   */
  public registerFactory<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
  }

  /**
   * Get a service instance
   */
  public get<T>(key: string): T {
    // Check if service is already instantiated
    if (this.services.has(key)) {
      return this.services.get(key);
    }

    // Check if we have a factory for this service
    if (this.factories.has(key)) {
      const factory = this.factories.get(key)!;
      const service = factory();
      this.services.set(key, service);
      return service;
    }

    throw new Error(`Service not found: ${key}`);
  }

  /**
   * Check if a service is registered
   */
  public has(key: string): boolean {
    return this.services.has(key) || this.factories.has(key);
  }

  /**
   * Clear all services (useful for testing)
   */
  public clear(): void {
    this.services.clear();
    this.factories.clear();
  }

  /**
   * Register default services
   */
  private registerDefaultServices(): void {
    // Register file system reader factory
    this.registerFactory(
      SERVICE_KEYS.FILE_SYSTEM_READER,
      () => new EnhancedFileSystemReader(),
    );

    // Register error boundary singleton
    this.register(
      SERVICE_KEYS.ERROR_BOUNDARY,
      ErrorBoundary.getInstance(),
    );

    // Register logger
    this.register(SERVICE_KEYS.LOGGER, logger);
  }

  /**
   * Create a scoped container with additional services
   */
  public createScope(): ScopedServiceContainer {
    return new ScopedServiceContainer(this);
  }
}

/**
 * Scoped service container that inherits from parent but can override services
 */
export class ScopedServiceContainer {
  private services: Map<string, any> = new Map();
  private factories: Map<string, () => any> = new Map();

  constructor(private parent: ServiceContainer) {}

  public register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  public registerFactory<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
  }

  public get<T>(key: string): T {
    // Check local scope first
    if (this.services.has(key)) {
      return this.services.get(key);
    }

    if (this.factories.has(key)) {
      const factory = this.factories.get(key)!;
      const service = factory();
      this.services.set(key, service);
      return service;
    }

    // Fall back to parent container
    return this.parent.get<T>(key);
  }

  public has(key: string): boolean {
    return this.services.has(key) ||
           this.factories.has(key) ||
           this.parent.has(key);
  }
}

/**
 * Convenience functions for accessing common services
 */
export const Services = {
  getFileSystemReader(): IFileSystemReader {
    return ServiceContainer.getInstance().get<IFileSystemReader>(SERVICE_KEYS.FILE_SYSTEM_READER);
  },

  getErrorBoundary(): ErrorBoundary {
    return ServiceContainer.getInstance().get<ErrorBoundary>(SERVICE_KEYS.ERROR_BOUNDARY);
  },

  getLogger() {
    return ServiceContainer.getInstance().get(SERVICE_KEYS.LOGGER);
  },
};

/**
 * Decorator for automatic dependency injection (experimental)
 */
export function Injectable(dependencies: string[] = []) {
  return function <T extends { new (...args: any[]): object }>(constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        const container = ServiceContainer.getInstance();
        const injectedDeps = dependencies.map(dep => container.get(dep));
        super(...injectedDeps, ...args);
      }
    };
  };
}

/**
 * Initialize the service container with custom configuration
 */
export function initializeServices(config?: {
  fileSystemRoot?: string;
  cacheTTL?: number;
  customServices?: Map<string, any>;
}): void {
  const container = ServiceContainer.getInstance();

  if (config?.customServices) {
    for (const [key, service] of config.customServices) {
      container.register(key, service);
    }
  }

  if (config?.fileSystemRoot || config?.cacheTTL) {
    container.registerFactory(
      SERVICE_KEYS.FILE_SYSTEM_READER,
      () => {
        const reader = new EnhancedFileSystemReader(config?.fileSystemRoot);
        if (config?.cacheTTL) {
          reader.setCacheTTL(config.cacheTTL);
        }
        return reader;
      },
    );
  }
}
