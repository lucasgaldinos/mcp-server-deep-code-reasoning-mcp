/**
 * Factory Pattern Implementation for Deep Code Reasoning MCP Server
 *
 * This module provides a comprehensive factory pattern implementation for creating
 * and managing service instances with dependency injection, configuration management,
 * lifecycle control, and advanced features like caching and lazy loading.
 *
 * @author Deep Code Reasoning MCP Team
 * @version 1.0.0
 * @since 2024
 */

import { Logger } from './Logger.js';

/**
 * Service registration information for the factory
 *
 * @example
 * ```typescript
 * const registration: ServiceRegistration<UserService> = {
 *   factory: (deps) => new UserService(deps.database),
 *   dependencies: ['database'],
 *   singleton: true
 * };
 * ```
 *
 * @since 1.0.0
 */
export interface ServiceRegistration<T = any> {
  /** Factory function to create service instances */
  factory: (dependencies: Record<string, any>, config?: any) => T | Promise<T>;
  /** List of dependency service names */
  dependencies?: string[];
  /** Whether to create as singleton (default: false) */
  singleton?: boolean;
  /** Optional configuration for the service */
  config?: any;
  /** Service lifecycle hooks */
  lifecycle?: {
    onInit?: (instance: T) => void | Promise<void>;
    onDestroy?: (instance: T) => void | Promise<void>;
  };
  /** Tags for service categorization */
  tags?: string[];
  /** Service priority for initialization order */
  priority?: number;
}

/**
 * Service container configuration options
 *
 * @example
 * ```typescript
 * const config: ContainerConfig = {
 *   enableLogging: true,
 *   enableCaching: true,
 *   strictDependencies: true
 * };
 * ```
 *
 * @since 1.0.0
 */
export interface ContainerConfig {
  /** Enable detailed logging of service operations */
  enableLogging?: boolean;
  /** Enable caching of service instances */
  enableCaching?: boolean;
  /** Throw errors for missing dependencies */
  strictDependencies?: boolean;
  /** Maximum depth for dependency resolution */
  maxDependencyDepth?: number;
  /** Timeout for async service creation (ms) */
  creationTimeout?: number;
  /** Environment-specific overrides */
  environment?: 'development' | 'test' | 'production';
}

/**
 * Service creation context for factory functions
 *
 * @example
 * ```typescript
 * const context: ServiceContext = {
 *   serviceName: 'userService',
 *   dependencies: { database: databaseInstance },
 *   config: { apiUrl: 'https://api.example.com' },
 *   container: serviceContainer
 * };
 * ```
 *
 * @since 1.0.0
 */
export interface ServiceContext {
  /** Name of the service being created */
  serviceName: string;
  /** Resolved dependencies */
  dependencies: Record<string, any>;
  /** Service configuration */
  config?: any;
  /** Reference to the container */
  container: ServiceContainer;
  /** Creation timestamp */
  createdAt: Date;
  /** Creation attempt number */
  attempt: number;
}

/**
 * Service factory error types for detailed error handling
 *
 * @example
 * ```typescript
 * try {
 *   const service = await container.get('userService');
 * } catch (error) {
 *   if (error instanceof ServiceFactoryError) {
 *     console.log(`Service error: ${error.serviceName} - ${error.cause}`);
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 */
export class ServiceFactoryError extends Error {
  /**
   * Creates a new service factory error
   *
   * @param message - Error message
   * @param serviceName - Name of the service that failed
   * @param cause - Underlying cause of the error
   *
   * @since 1.0.0
   */
  constructor(
    message: string,
    public readonly serviceName: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'ServiceFactoryError';
  }
}

/**
 * Circular dependency error for dependency cycle detection
 *
 * @example
 * ```typescript
 * try {
 *   const service = await container.get('serviceA');
 * } catch (error) {
 *   if (error instanceof CircularDependencyError) {
 *     console.log(`Circular dependency: ${error.dependencyChain.join(' -> ')}`);
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 */
export class CircularDependencyError extends ServiceFactoryError {
  /**
   * Creates a new circular dependency error
   *
   * @param dependencyChain - Chain of dependencies that form the cycle
   *
   * @since 1.0.0
   */
  constructor(public readonly dependencyChain: string[]) {
    super(
      `Circular dependency detected: ${dependencyChain.join(' -> ')}`,
      dependencyChain[0],
    );
    this.name = 'CircularDependencyError';
  }
}

/**
 * Comprehensive service container with dependency injection and lifecycle management
 *
 * This implementation provides advanced features including:
 * - Dependency injection with circular dependency detection
 * - Singleton and transient service lifecycles
 * - Async service creation with timeout support
 * - Service tagging and categorization
 * - Configuration management
 * - Lifecycle hooks (onInit, onDestroy)
 * - Performance monitoring and logging
 *
 * @example
 * ```typescript
 * const container = new ServiceContainer({
 *   enableLogging: true,
 *   enableCaching: true
 * });
 *
 * // Register services
 * container.register('database', {
 *   factory: () => new DatabaseService(),
 *   singleton: true,
 *   tags: ['persistence']
 * });
 *
 * container.register('userService', {
 *   factory: (deps) => new UserService(deps.database),
 *   dependencies: ['database'],
 *   singleton: true,
 *   tags: ['business-logic']
 * });
 *
 * // Use services
 * const userService = await container.get('userService');
 * ```
 *
 * @since 1.0.0
 */
export class ServiceContainer {
  private registrations = new Map<string, ServiceRegistration>();
  private instances = new Map<string, any>();
  private creating = new Set<string>();
  private destroyed = false;
  private logger: Logger;

  /**
   * Creates a new service container
   *
   * @param config - Container configuration options
   *
   * @example
   * ```typescript
   * const container = new ServiceContainer({
   *   enableLogging: true,
   *   strictDependencies: true,
   *   maxDependencyDepth: 10
   * });
   * ```
   *
   * @since 1.0.0
   */
  constructor(private config: ContainerConfig = {}) {
    this.logger = new Logger('ServiceContainer');
    this.applyDefaultConfig();

    if (this.config.enableLogging) {
      this.logger.info('Service container initialized', { config: this.config });
    }
  }

  /**
   * Registers a service with the container
   *
   * @param name - Unique service name
   * @param registration - Service registration configuration
   * @returns This container for method chaining
   *
   * @example
   * ```typescript
   * container
   *   .register('database', {
   *     factory: () => new DatabaseService(),
   *     singleton: true
   *   })
   *   .register('userService', {
   *     factory: (deps) => new UserService(deps.database),
   *     dependencies: ['database']
   *   });
   * ```
   *
   * @throws {ServiceFactoryError} When service is already registered
   * @since 1.0.0
   */
  register<T>(name: string, registration: ServiceRegistration<T>): this {
    if (this.destroyed) {
      throw new ServiceFactoryError('Cannot register services on destroyed container', name);
    }

    if (this.registrations.has(name)) {
      throw new ServiceFactoryError(`Service '${name}' is already registered`, name);
    }

    // Validate registration
    this.validateRegistration(name, registration);

    // Set defaults
    const normalizedRegistration: ServiceRegistration<T> = {
      singleton: false,
      dependencies: [],
      priority: 0,
      tags: [],
      ...registration,
    };

    this.registrations.set(name, normalizedRegistration);

    if (this.config.enableLogging) {
      this.logger.info(`Service '${name}' registered`, {
        singleton: normalizedRegistration.singleton,
        dependencies: normalizedRegistration.dependencies,
        tags: normalizedRegistration.tags,
      });
    }

    return this;
  }

  /**
   * Retrieves a service instance from the container
   *
   * @param name - Service name to retrieve
   * @param context - Optional creation context
   * @returns Promise resolving to service instance
   *
   * @example
   * ```typescript
   * const userService = await container.get<UserService>('userService');
   * const database = await container.get('database');
   * ```
   *
   * @throws {ServiceFactoryError} When service is not registered
   * @throws {CircularDependencyError} When circular dependency is detected
   * @since 1.0.0
   */
  async get<T>(name: string, context?: Partial<ServiceContext>): Promise<T> {
    if (this.destroyed) {
      throw new ServiceFactoryError('Cannot get services from destroyed container', name);
    }

    const registration = this.registrations.get(name);
    if (!registration) {
      if (this.config.strictDependencies) {
        throw new ServiceFactoryError(`Service '${name}' is not registered`, name);
      } else {
        this.logger.warn(`Service '${name}' not found, returning undefined`);
        return undefined as any;
      }
    }

    // Return cached singleton instance
    if (registration.singleton && this.instances.has(name)) {
      return this.instances.get(name);
    }

    // Check for circular dependencies
    if (this.creating.has(name)) {
      const dependencyChain = Array.from(this.creating).concat(name);
      throw new CircularDependencyError(dependencyChain);
    }

    return await this.createService<T>(name, registration, context);
  }

  /**
   * Checks if a service is registered
   *
   * @param name - Service name to check
   * @returns Whether the service is registered
   *
   * @example
   * ```typescript
   * if (container.has('userService')) {
   *   const service = await container.get('userService');
   * }
   * ```
   *
   * @since 1.0.0
   */
  has(name: string): boolean {
    return this.registrations.has(name);
  }

  /**
   * Removes a service registration and destroys instances
   *
   * @param name - Service name to unregister
   * @returns Whether the service was unregistered
   *
   * @example
   * ```typescript
   * const removed = await container.unregister('oldService');
   * ```
   *
   * @since 1.0.0
   */
  async unregister(name: string): Promise<boolean> {
    if (!this.registrations.has(name)) {
      return false;
    }

    // Destroy instance if it exists
    if (this.instances.has(name)) {
      await this.destroyService(name);
    }

    this.registrations.delete(name);

    if (this.config.enableLogging) {
      this.logger.info(`Service '${name}' unregistered`);
    }

    return true;
  }

  /**
   * Lists all registered service names
   *
   * @param filter - Optional filter criteria
   * @returns Array of service names
   *
   * @example
   * ```typescript
   * const allServices = container.list();
   * const businessServices = container.list({ tags: ['business-logic'] });
   * const singletons = container.list({ singleton: true });
   * ```
   *
   * @since 1.0.0
   */
  list(filter?: {
    tags?: string[];
    singleton?: boolean;
    hasInstance?: boolean;
  }): string[] {
    const names = Array.from(this.registrations.keys());

    if (!filter) {
      return names;
    }

    return names.filter(name => {
      const registration = this.registrations.get(name)!;

      if (filter.tags && !filter.tags.some(tag => registration.tags?.includes(tag))) {
        return false;
      }

      if (filter.singleton !== undefined && registration.singleton !== filter.singleton) {
        return false;
      }

      if (filter.hasInstance !== undefined) {
        const hasInstance = this.instances.has(name);
        if (hasInstance !== filter.hasInstance) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Gets service registration information
   *
   * @param name - Service name
   * @returns Service registration or undefined
   *
   * @example
   * ```typescript
   * const registration = container.getRegistration('userService');
   * if (registration) {
   *   console.log('Dependencies:', registration.dependencies);
   * }
   * ```
   *
   * @since 1.0.0
   */
  getRegistration(name: string): ServiceRegistration | undefined {
    return this.registrations.get(name);
  }

  /**
   * Destroys all services and clears the container
   *
   * @returns Promise resolving when all services are destroyed
   *
   * @example
   * ```typescript
   * await container.destroy();
   * ```
   *
   * @since 1.0.0
   */
  async destroy(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    if (this.config.enableLogging) {
      this.logger.info('Destroying service container');
    }

    // Destroy all instances
    const destroyPromises = Array.from(this.instances.keys()).map(name =>
      this.destroyService(name).catch(error => {
        this.logger.error(`Error destroying service '${name}':`, error);
      }),
    );

    await Promise.all(destroyPromises);

    this.instances.clear();
    this.registrations.clear();
    this.creating.clear();
    this.destroyed = true;

    if (this.config.enableLogging) {
      this.logger.info('Service container destroyed');
    }
  }

  /**
   * Gets container statistics and health information
   *
   * @returns Container statistics
   *
   * @example
   * ```typescript
   * const stats = container.getStats();
   * console.log(`${stats.instanceCount} instances of ${stats.registrationCount} services`);
   * ```
   *
   * @since 1.0.0
   */
  getStats(): {
    registrationCount: number;
    instanceCount: number;
    singletonCount: number;
    creating: string[];
    destroyed: boolean;
    } {
    return {
      registrationCount: this.registrations.size,
      instanceCount: this.instances.size,
      singletonCount: Array.from(this.registrations.values()).filter(r => r.singleton).length,
      creating: Array.from(this.creating),
      destroyed: this.destroyed,
    };
  }

  /**
   * Creates a service instance with dependency resolution
   *
   * @param name - Service name
   * @param registration - Service registration
   * @param context - Creation context
   * @returns Promise resolving to service instance
   *
   * @private
   * @since 1.0.0
   */
  private async createService<T>(
    name: string,
    registration: ServiceRegistration<T>,
    context?: Partial<ServiceContext>,
  ): Promise<T> {
    this.creating.add(name);

    try {
      const startTime = Date.now();

      // Resolve dependencies
      const dependencies = await this.resolveDependencies(registration.dependencies || []);

      // Create service context
      const serviceContext: ServiceContext = {
        serviceName: name,
        dependencies,
        config: registration.config,
        container: this,
        createdAt: new Date(),
        attempt: 1,
        ...context,
      };

      // Create instance with timeout
      const instance = await this.createWithTimeout(
        name,
        registration.factory,
        dependencies,
        registration.config,
      );

      // Execute onInit lifecycle hook
      if (registration.lifecycle?.onInit) {
        await registration.lifecycle.onInit(instance);
      }

      // Cache singleton instances
      if (registration.singleton) {
        this.instances.set(name, instance);
      }

      const duration = Date.now() - startTime;

      if (this.config.enableLogging) {
        this.logger.info(`Service '${name}' created`, {
          duration: `${duration}ms`,
          singleton: registration.singleton,
          dependencies: registration.dependencies,
        });
      }

      return instance;
    } catch (error) {
      const factoryError = error instanceof ServiceFactoryError
        ? error
        : new ServiceFactoryError(
          `Failed to create service '${name}': ${error instanceof Error ? error.message : 'Unknown error'}`,
          name,
          error instanceof Error ? error : undefined,
        );

      if (this.config.enableLogging) {
        this.logger.error(`Service creation failed for '${name}':`, factoryError);
      }

      throw factoryError;
    } finally {
      this.creating.delete(name);
    }
  }

  /**
   * Resolves all dependencies for a service
   *
   * @param dependencyNames - Names of dependencies to resolve
   * @returns Promise resolving to dependency map
   *
   * @private
   * @since 1.0.0
   */
  private async resolveDependencies(dependencyNames: string[]): Promise<Record<string, any>> {
    const dependencies: Record<string, any> = {};

    // Resolve dependencies sequentially to avoid race conditions with circular dependency detection
    for (const depName of dependencyNames) {
      const instance = await this.get(depName);
      dependencies[depName] = instance;
    }

    return dependencies;
  }

  /**
   * Creates service with timeout protection
   *
   * @param name - Service name
   * @param factory - Factory function
   * @param dependencies - Resolved dependencies
   * @param config - Service configuration
   * @returns Promise resolving to service instance
   *
   * @private
   * @since 1.0.0
   */
  private async createWithTimeout<T>(
    name: string,
    factory: (deps: Record<string, any>, config?: any) => T | Promise<T>,
    dependencies: Record<string, any>,
    config?: any,
  ): Promise<T> {
    const timeout = this.config.creationTimeout || 30000; // 30 seconds default

    return Promise.race([
      Promise.resolve(factory(dependencies, config)),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new ServiceFactoryError(
            `Service creation timeout after ${timeout}ms`,
            name,
          ));
        }, timeout);
      }),
    ]);
  }

  /**
   * Destroys a service instance
   *
   * @param name - Service name to destroy
   *
   * @private
   * @since 1.0.0
   */
  private async destroyService(name: string): Promise<void> {
    const instance = this.instances.get(name);
    if (!instance) {
      return;
    }

    const registration = this.registrations.get(name);
    if (registration?.lifecycle?.onDestroy) {
      try {
        await registration.lifecycle.onDestroy(instance);
      } catch (error) {
        this.logger.error(`Error in onDestroy for service '${name}':`, error);
      }
    }

    this.instances.delete(name);

    if (this.config.enableLogging) {
      this.logger.info(`Service '${name}' destroyed`);
    }
  }

  /**
   * Validates service registration
   *
   * @param name - Service name
   * @param registration - Registration to validate
   *
   * @private
   * @since 1.0.0
   */
  private validateRegistration(name: string, registration: ServiceRegistration): void {
    if (!registration.factory || typeof registration.factory !== 'function') {
      throw new ServiceFactoryError(`Invalid factory function for service '${name}'`, name);
    }

    if (registration.dependencies && !Array.isArray(registration.dependencies)) {
      throw new ServiceFactoryError(`Dependencies must be an array for service '${name}'`, name);
    }

    if (registration.priority !== undefined && typeof registration.priority !== 'number') {
      throw new ServiceFactoryError(`Priority must be a number for service '${name}'`, name);
    }
  }

  /**
   * Applies default configuration values
   *
   * @private
   * @since 1.0.0
   */
  private applyDefaultConfig(): void {
    this.config = {
      enableLogging: false,
      enableCaching: true,
      strictDependencies: true,
      maxDependencyDepth: 50,
      creationTimeout: 30000,
      environment: 'production',
      ...this.config,
    };
  }
}

/**
 * Global service container instance for application-wide service management
 *
 * @example
 * ```typescript
 * import { globalContainer } from './ServiceFactory';
 *
 * globalContainer.register('config', {
 *   factory: () => new ConfigService(),
 *   singleton: true
 * });
 *
 * const config = await globalContainer.get('config');
 * ```
 *
 * @since 1.0.0
 */
export const globalContainer = new ServiceContainer({
  enableLogging: process.env.NODE_ENV === 'development',
  enableCaching: true,
  strictDependencies: true,
});

/**
 * Convenient factory functions for common service patterns
 *
 * @since 1.0.0
 */
export class ServiceFactory {
  /**
   * Creates a singleton service registration
   *
   * @param factory - Factory function
   * @param options - Additional registration options
   * @returns Service registration
   *
   * @example
   * ```typescript
   * container.register('database', ServiceFactory.singleton(
   *   () => new DatabaseService(),
   *   { tags: ['persistence'] }
   * ));
   * ```
   *
   * @since 1.0.0
   */
  static singleton<T>(
    factory: (dependencies: Record<string, any>, config?: any) => T | Promise<T>,
    options: Omit<ServiceRegistration<T>, 'factory' | 'singleton'> = {},
  ): ServiceRegistration<T> {
    return {
      factory,
      singleton: true,
      ...options,
    };
  }

  /**
   * Creates a transient service registration
   *
   * @param factory - Factory function
   * @param options - Additional registration options
   * @returns Service registration
   *
   * @example
   * ```typescript
   * container.register('request', ServiceFactory.transient(
   *   (deps, config) => new RequestService(config.apiUrl),
   *   { dependencies: ['httpClient'] }
   * ));
   * ```
   *
   * @since 1.0.0
   */
  static transient<T>(
    factory: (dependencies: Record<string, any>, config?: any) => T | Promise<T>,
    options: Omit<ServiceRegistration<T>, 'factory' | 'singleton'> = {},
  ): ServiceRegistration<T> {
    return {
      factory,
      singleton: false,
      ...options,
    };
  }

  /**
   * Creates a value-based service registration
   *
   * @param value - Value to register
   * @param options - Additional registration options
   * @returns Service registration
   *
   * @example
   * ```typescript
   * container.register('apiUrl', ServiceFactory.value('https://api.example.com'));
   * container.register('config', ServiceFactory.value(configObject));
   * ```
   *
   * @since 1.0.0
   */
  static value<T>(
    value: T,
    options: Omit<ServiceRegistration<T>, 'factory' | 'singleton'> = {},
  ): ServiceRegistration<T> {
    return {
      factory: () => value,
      singleton: true,
      ...options,
    };
  }

  /**
   * Creates a lazy service registration that's created on first access
   *
   * @param factory - Factory function
   * @param options - Additional registration options
   * @returns Service registration
   *
   * @example
   * ```typescript
   * container.register('heavyService', ServiceFactory.lazy(
   *   () => new HeavyComputationService(),
   *   { singleton: true }
   * ));
   * ```
   *
   * @since 1.0.0
   */
  static lazy<T>(
    factory: () => T | Promise<T>,
    options: Omit<ServiceRegistration<T>, 'factory'> = {},
  ): ServiceRegistration<T> {
    return {
      factory: () => factory(),
      singleton: true,
      ...options,
    };
  }
}

// Re-export type aliases for convenience
export type ServiceRegistrationType = ServiceRegistration;
export type ContainerConfigType = ContainerConfig;
export type ServiceContextType = ServiceContext;
