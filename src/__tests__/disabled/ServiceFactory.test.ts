/**
 * Tests for Service Factory and Dependency Injection Container
 * 
 * Comprehensive test suite covering service registration, dependency injection,
 * lifecycle management, error handling, and advanced factory pattern features.
 * 
 * @author Deep Code Reasoning MCP Team
 * @version 1.0.0
 * @since 2024
 */

import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  ServiceContainer,
  ServiceFactory,
  ServiceFactoryError,
  CircularDependencyError,
  ServiceRegistration,
  ContainerConfig
} from '../utils/service-factory.js';

// Mock services for testing
class MockDatabase {
  constructor(public readonly connectionString: string = 'mock://database') {}
  
  async connect(): Promise<void> {
    // Mock connection
  }
  
  async disconnect(): Promise<void> {
    // Mock disconnection
  }
}

class MockUserService {
  constructor(
    private database: MockDatabase,
    private config?: any
  ) {}
  
  async getUser(id: string): Promise<any> {
    return { id, name: 'Test User' };
  }
}

class MockAuthService {
  constructor(
    private userService: MockUserService,
    private database: MockDatabase
  ) {}
  
  async authenticate(token: string): Promise<any> {
    return { token, valid: true };
  }
}

class MockNotificationService {
  constructor(private config: any) {}
  
  async sendNotification(message: string): Promise<void> {
    // Mock notification
  }
}

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer({
      enableLogging: false,
      enableCaching: true,
      strictDependencies: true
    });
  });

  afterEach(async () => {
    await container.destroy();
  });

  describe('service registration', () => {
    test('should register simple service', () => {
      const registration: ServiceRegistration<MockDatabase> = {
        factory: () => new MockDatabase(),
        singleton: true
      };

      container.register('database', registration);
      
      expect(container.has('database')).toBe(true);
      expect(container.getRegistration('database')).toEqual(expect.objectContaining({
        singleton: true,
        dependencies: [],
        priority: 0,
        tags: []
      }));
    });

    test('should register service with dependencies', () => {
      container.register('database', {
        factory: () => new MockDatabase(),
        singleton: true
      });

      container.register('userService', {
        factory: (deps) => new MockUserService(deps.database),
        dependencies: ['database'],
        singleton: true,
        tags: ['business-logic']
      });

      expect(container.has('userService')).toBe(true);
      const registration = container.getRegistration('userService');
      expect(registration?.dependencies).toEqual(['database']);
      expect(registration?.tags).toContain('business-logic');
    });

    test('should prevent duplicate registration', () => {
      container.register('database', {
        factory: () => new MockDatabase()
      });

      expect(() => {
        container.register('database', {
          factory: () => new MockDatabase()
        });
      }).toThrow(ServiceFactoryError);
    });

    test('should validate registration parameters', () => {
      expect(() => {
        container.register('invalid', {
          factory: null as any
        });
      }).toThrow(ServiceFactoryError);

      expect(() => {
        container.register('invalid', {
          factory: () => new MockDatabase(),
          dependencies: 'not-an-array' as any
        });
      }).toThrow(ServiceFactoryError);
    });

    test('should handle registration with lifecycle hooks', () => {
      const onInit = vi.fn<(instance: MockDatabase) => void>();
      const onDestroy = vi.fn<(instance: MockDatabase) => void>();

      container.register('database', {
        factory: () => new MockDatabase(),
        singleton: true,
        lifecycle: {
          onInit,
          onDestroy
        }
      });

      expect(container.has('database')).toBe(true);
    });
  });

  describe('service retrieval', () => {
    test('should create and return service instance', async () => {
      container.register('database', {
        factory: () => new MockDatabase(),
        singleton: true
      });

      const instance = await container.get<MockDatabase>('database');
      expect(instance).toBeInstanceOf(MockDatabase);
      expect(instance.connectionString).toBe('mock://database');
    });

    test('should return same instance for singleton services', async () => {
      container.register('database', {
        factory: () => new MockDatabase(),
        singleton: true
      });

      const instance1 = await container.get('database');
      const instance2 = await container.get('database');
      
      expect(instance1).toBe(instance2);
    });

    test('should return different instances for transient services', async () => {
      container.register('database', {
        factory: () => new MockDatabase(),
        singleton: false
      });

      const instance1 = await container.get('database');
      const instance2 = await container.get('database');
      
      expect(instance1).not.toBe(instance2);
      expect(instance1).toBeInstanceOf(MockDatabase);
      expect(instance2).toBeInstanceOf(MockDatabase);
    });

    test('should resolve dependencies correctly', async () => {
      container.register('database', {
        factory: () => new MockDatabase('test://connection'),
        singleton: true
      });

      container.register('userService', {
        factory: (deps) => new MockUserService(deps.database),
        dependencies: ['database'],
        singleton: true
      });

      const userService = await container.get<MockUserService>('userService');
      expect(userService).toBeInstanceOf(MockUserService);
      
      // Verify dependency was injected correctly
      const user = await userService.getUser('123');
      expect(user).toEqual({ id: '123', name: 'Test User' });
    });

    test('should handle complex dependency chains', async () => {
      container.register('database', {
        factory: () => new MockDatabase(),
        singleton: true
      });

      container.register('userService', {
        factory: (deps) => new MockUserService(deps.database),
        dependencies: ['database'],
        singleton: true
      });

      container.register('authService', {
        factory: (deps) => new MockAuthService(deps.userService, deps.database),
        dependencies: ['userService', 'database'],
        singleton: true
      });

      const authService = await container.get<MockAuthService>('authService');
      expect(authService).toBeInstanceOf(MockAuthService);
      
      const result = await authService.authenticate('test-token');
      expect(result).toEqual({ token: 'test-token', valid: true });
    });

    test('should handle async factory functions', async () => {
      container.register('asyncService', {
        factory: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return new MockDatabase('async://connection');
        },
        singleton: true
      });

      const instance = await container.get<MockDatabase>('asyncService');
      expect(instance).toBeInstanceOf(MockDatabase);
      expect(instance.connectionString).toBe('async://connection');
    });

    test('should pass configuration to factory', async () => {
      const config = { apiUrl: 'https://api.example.com', timeout: 5000 };
      
      container.register('configuredService', {
        factory: (deps, config) => new MockNotificationService(config),
        config,
        singleton: true
      });

      const instance = await container.get<MockNotificationService>('configuredService');
      expect(instance).toBeInstanceOf(MockNotificationService);
    });

    test('should throw error for unregistered service in strict mode', async () => {
      await expect(container.get('nonexistent')).rejects.toThrow(ServiceFactoryError);
    });

    test('should return undefined for unregistered service in non-strict mode', async () => {
      const nonStrictContainer = new ServiceContainer({
        strictDependencies: false,
        enableLogging: false
      });

      const result = await nonStrictContainer.get('nonexistent');
      expect(result).toBeUndefined();

      await nonStrictContainer.destroy();
    });
  });

  describe('circular dependency detection', () => {
    test('should detect direct circular dependency', async () => {
      container.register('serviceA', {
        factory: (deps) => ({ name: 'A', dep: deps.serviceB }),
        dependencies: ['serviceB']
      });

      container.register('serviceB', {
        factory: (deps) => ({ name: 'B', dep: deps.serviceA }),
        dependencies: ['serviceA']
      });

      await expect(container.get('serviceA')).rejects.toThrow(CircularDependencyError);
    });

    test('should detect indirect circular dependency', async () => {
      container.register('serviceA', {
        factory: (deps) => ({ name: 'A', dep: deps.serviceB }),
        dependencies: ['serviceB']
      });

      container.register('serviceB', {
        factory: (deps) => ({ name: 'B', dep: deps.serviceC }),
        dependencies: ['serviceC']
      });

      container.register('serviceC', {
        factory: (deps) => ({ name: 'C', dep: deps.serviceA }),
        dependencies: ['serviceA']
      });

      await expect(container.get('serviceA')).rejects.toThrow(CircularDependencyError);
    });

    test('should provide dependency chain in circular dependency error', async () => {
      container.register('serviceA', {
        factory: (deps) => ({ dep: deps.serviceB }),
        dependencies: ['serviceB']
      });

      container.register('serviceB', {
        factory: (deps) => ({ dep: deps.serviceA }),
        dependencies: ['serviceA']
      });

      try {
        await container.get('serviceA');
        fail('Expected CircularDependencyError');
      } catch (error) {
        expect(error).toBeInstanceOf(CircularDependencyError);
        const circularError = error as CircularDependencyError;
        expect(circularError.dependencyChain).toContain('serviceA');
        expect(circularError.dependencyChain).toContain('serviceB');
      }
    });
  });

  describe('lifecycle management', () => {
    test('should call onInit lifecycle hook', async () => {
      const onInit = vi.fn<(instance: MockDatabase) => void>();
      const instance = new MockDatabase();

      container.register('database', {
        factory: () => instance,
        singleton: true,
        lifecycle: { onInit }
      });

      await container.get('database');
      expect(onInit).toHaveBeenCalledWith(instance);
    });

    test('should call onDestroy lifecycle hook during unregister', async () => {
      const onDestroy = vi.fn<(instance: MockDatabase) => void>();
      const instance = new MockDatabase();

      container.register('database', {
        factory: () => instance,
        singleton: true,
        lifecycle: { onDestroy }
      });

      await container.get('database'); // Create instance
      await container.unregister('database');
      
      expect(onDestroy).toHaveBeenCalledWith(instance);
    });

    test('should call onDestroy lifecycle hook during container destroy', async () => {
      const onDestroy = vi.fn<(instance: MockDatabase) => void>();
      const instance = new MockDatabase();

      container.register('database', {
        factory: () => instance,
        singleton: true,
        lifecycle: { onDestroy }
      });

      await container.get('database'); // Create instance
      await container.destroy();
      
      expect(onDestroy).toHaveBeenCalledWith(instance);
    });

    test('should handle async lifecycle hooks', async () => {
      const onInit = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      container.register('database', {
        factory: () => new MockDatabase(),
        singleton: true,
        lifecycle: { onInit }
      });

      await container.get('database');
      expect(onInit).toHaveBeenCalled();
    });

    test('should handle lifecycle hook errors gracefully', async () => {
      const onInit = vi.fn(() => {
        throw new Error('Init failed');
      });

      container.register('database', {
        factory: () => new MockDatabase(),
        singleton: true,
        lifecycle: { onInit }
      });

      // Should still throw the onInit error
      await expect(container.get('database')).rejects.toThrow('Init failed');
    });
  });

  describe('container management', () => {
    test('should list registered services', () => {
      container.register('database', {
        factory: () => new MockDatabase(),
        singleton: true,
        tags: ['persistence']
      });

      container.register('userService', {
        factory: (deps) => new MockUserService(deps.database),
        dependencies: ['database'],
        singleton: false,
        tags: ['business-logic']
      });

      const allServices = container.list();
      expect(allServices).toContain('database');
      expect(allServices).toContain('userService');
      expect(allServices).toHaveLength(2);
    });

    test('should filter services by criteria', async () => {
      container.register('database', {
        factory: () => new MockDatabase(),
        singleton: true,
        tags: ['persistence']
      });

      container.register('userService', {
        factory: (deps) => new MockUserService(deps.database),
        dependencies: ['database'],
        singleton: false,
        tags: ['business-logic']
      });

      // Filter by tags
      const persistenceServices = container.list({ tags: ['persistence'] });
      expect(persistenceServices).toEqual(['database']);

      const businessServices = container.list({ tags: ['business-logic'] });
      expect(businessServices).toEqual(['userService']);

      // Filter by singleton
      const singletons = container.list({ singleton: true });
      expect(singletons).toEqual(['database']);

      // Create instance and filter by hasInstance
      await container.get('database');
      const withInstances = container.list({ hasInstance: true });
      expect(withInstances).toEqual(['database']);
    });

    test('should unregister services', async () => {
      container.register('database', {
        factory: () => new MockDatabase(),
        singleton: true
      });

      expect(container.has('database')).toBe(true);
      
      const unregistered = await container.unregister('database');
      expect(unregistered).toBe(true);
      expect(container.has('database')).toBe(false);
      
      const notFound = await container.unregister('nonexistent');
      expect(notFound).toBe(false);
    });

    test('should provide container statistics', async () => {
      container.register('database', {
        factory: () => new MockDatabase(),
        singleton: true
      });

      container.register('userService', {
        factory: (deps) => new MockUserService(deps.database),
        dependencies: ['database'],
        singleton: false
      });

      let stats = container.getStats();
      expect(stats.registrationCount).toBe(2);
      expect(stats.instanceCount).toBe(0);
      expect(stats.singletonCount).toBe(1);
      expect(stats.destroyed).toBe(false);

      await container.get('database');
      await container.get('userService');

      stats = container.getStats();
      expect(stats.instanceCount).toBe(1); // Only singleton is cached
    });

    test('should prevent operations on destroyed container', async () => {
      container.register('database', {
        factory: () => new MockDatabase()
      });

      await container.destroy();

      expect(() => {
        container.register('newService', {
          factory: () => new MockDatabase()
        });
      }).toThrow(ServiceFactoryError);

      await expect(container.get('database')).rejects.toThrow(ServiceFactoryError);
    });
  });

  describe('error handling', () => {
    test('should handle factory function errors', async () => {
      container.register('failingService', {
        factory: () => {
          throw new Error('Factory failed');
        }
      });

      await expect(container.get('failingService')).rejects.toThrow(ServiceFactoryError);
    });

    test('should handle async factory errors', async () => {
      container.register('asyncFailingService', {
        factory: async () => {
          throw new Error('Async factory failed');
        }
      });

      await expect(container.get('asyncFailingService')).rejects.toThrow(ServiceFactoryError);
    });

    test('should handle dependency resolution errors', async () => {
      container.register('userService', {
        factory: (deps) => new MockUserService(deps.database),
        dependencies: ['database'] // database not registered
      });

      await expect(container.get('userService')).rejects.toThrow(ServiceFactoryError);
    });

    test('should handle creation timeout', async () => {
      const slowContainer = new ServiceContainer({
        creationTimeout: 100,
        enableLogging: false
      });

      slowContainer.register('slowService', {
        factory: async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
          return new MockDatabase();
        }
      });

      await expect(slowContainer.get('slowService')).rejects.toThrow(ServiceFactoryError);
      await slowContainer.destroy();
    });
  });
});

describe('ServiceFactory', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer({ enableLogging: false });
  });

  afterEach(async () => {
    await container.destroy();
  });

  describe('convenience methods', () => {
    test('should create singleton registration', () => {
      const registration = ServiceFactory.singleton(
        () => new MockDatabase(),
        { tags: ['persistence'] }
      );

      expect(registration.singleton).toBe(true);
      expect(registration.tags).toEqual(['persistence']);
      expect(typeof registration.factory).toBe('function');
    });

    test('should create transient registration', () => {
      const registration = ServiceFactory.transient(
        (deps) => new MockUserService(deps.database),
        { dependencies: ['database'] }
      );

      expect(registration.singleton).toBe(false);
      expect(registration.dependencies).toEqual(['database']);
      expect(typeof registration.factory).toBe('function');
    });

    test('should create value registration', () => {
      const config = { apiUrl: 'https://api.example.com' };
      const registration = ServiceFactory.value(config);

      expect(registration.singleton).toBe(true);
      expect(registration.factory({}, {})).toBe(config);
    });

    test('should create lazy registration', () => {
      const registration = ServiceFactory.lazy(
        () => new MockDatabase('lazy://connection'),
        { tags: ['lazy-loaded'] }
      );

      expect(registration.singleton).toBe(true);
      expect(registration.tags).toEqual(['lazy-loaded']);
      
      const instance = registration.factory({});
      expect(instance).toBeInstanceOf(MockDatabase);
    });
  });

  describe('integration with container', () => {
    test('should work with singleton factory', async () => {
      container.register('database', ServiceFactory.singleton(
        () => new MockDatabase('singleton://db')
      ));

      const instance1 = await container.get<MockDatabase>('database');
      const instance2 = await container.get<MockDatabase>('database');
      
      expect(instance1).toBe(instance2);
      expect(instance1.connectionString).toBe('singleton://db');
    });

    test('should work with transient factory', async () => {
      container.register('database', ServiceFactory.transient(
        () => new MockDatabase('transient://db')
      ));

      const instance1 = await container.get<MockDatabase>('database');
      const instance2 = await container.get<MockDatabase>('database');
      
      expect(instance1).not.toBe(instance2);
      expect(instance1.connectionString).toBe('transient://db');
      expect(instance2.connectionString).toBe('transient://db');
    });

    test('should work with value factory', async () => {
      const config = { apiUrl: 'https://api.example.com', version: 'v1' };
      container.register('config', ServiceFactory.value(config));

      const retrievedConfig = await container.get('config');
      expect(retrievedConfig).toBe(config);
    });

    test('should work with lazy factory', async () => {
      let created = false;
      
      container.register('lazyService', ServiceFactory.lazy(() => {
        created = true;
        return new MockDatabase('lazy://created');
      }));

      expect(created).toBe(false);
      
      const instance = await container.get<MockDatabase>('lazyService');
      expect(created).toBe(true);
      expect(instance.connectionString).toBe('lazy://created');
    });
  });
});

describe('Error Classes', () => {
  describe('ServiceFactoryError', () => {
    test('should create error with service name and cause', () => {
      const cause = new Error('Original error');
      const error = new ServiceFactoryError('Service failed', 'testService', cause);

      expect(error.message).toBe('Service failed');
      expect(error.serviceName).toBe('testService');
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('ServiceFactoryError');
    });

    test('should work without cause', () => {
      const error = new ServiceFactoryError('Service failed', 'testService');

      expect(error.message).toBe('Service failed');
      expect(error.serviceName).toBe('testService');
      expect(error.cause).toBeUndefined();
    });
  });

  describe('CircularDependencyError', () => {
    test('should create error with dependency chain', () => {
      const chain = ['serviceA', 'serviceB', 'serviceC', 'serviceA'];
      const error = new CircularDependencyError(chain);

      expect(error.dependencyChain).toEqual(chain);
      expect(error.serviceName).toBe('serviceA');
      expect(error.message).toContain('serviceA -> serviceB -> serviceC -> serviceA');
      expect(error.name).toBe('CircularDependencyError');
    });
  });
});
