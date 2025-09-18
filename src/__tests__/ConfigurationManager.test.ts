/**
 * @fileoverview Tests for ConfigurationManager
 */

import { vi } from 'vitest';
import { 
  ConfigurationManager,
  DefaultConfigSource,
  EnvironmentConfigSource,
  FileConfigSource
} from '../config/configuration-manager.js';
import { EnvironmentValidator } from '../utils/environment-validator.js';
import * as fs from 'fs';

// Mock dependencies
vi.mock('../utils/environment-validator.js');
vi.mock('fs');

const mockEnvironmentValidator = vi.mocked(EnvironmentValidator);
const mockFs = vi.mocked(fs);

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  let tempConfigPath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    configManager = ConfigurationManager.getInstance();
    tempConfigPath = './test-config.json';
    
    // Mock successful environment validation with static method
    mockEnvironmentValidator.getValidatedConfig = vi.fn().mockReturnValue({
      geminiApiKey: 'test-key',
      nodeEnv: 'test',
      mcpServerName: 'test-server',
      mcpServerVersion: '1.0.0',
      requestTimeout: 30000,
      maxConcurrentRequests: 5,
    } as any);
  });

  afterEach(async () => {
    // Clean up any test files
    if (mockFs.existsSync(tempConfigPath)) {
      await fs.promises.unlink(tempConfigPath);
    }
  });

  describe('initialization', () => {
    it('should initialize with default sources', async () => {
      await configManager.initialize();
      
      const summary = configManager.getConfigurationSummary() as any;
      expect(summary.initialized).toBe(true);
      expect(summary.sources).toEqual(['defaults', 'file', 'environment']);
    });

    it('should initialize with custom sources', async () => {
      const customSources = [
        new DefaultConfigSource(),
        new EnvironmentConfigSource(),
      ];

      await configManager.initialize(customSources);
      
      const summary = configManager.getConfigurationSummary() as any;
      expect(summary.sources).toEqual(['defaults', 'environment']);
    });

    it('should not re-initialize if already initialized', async () => {
      await configManager.initialize();
      
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await configManager.initialize();
      
      expect(spy).toHaveBeenCalledWith('Configuration manager already initialized');
      spy.mockRestore();
    });
  });

  describe('configuration access', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    it('should get complete configuration', () => {
      const config = configManager.getConfig();
      
      expect(config).toBeDefined();
      expect(config.geminiApiKey).toBe('test-key');
      expect(config.nodeEnv).toBe('test');
    });

    it('should get specific configuration value', () => {
      const apiKey = configManager.get('geminiApiKey');
      expect(apiKey).toBe('test-key');
    });

    it('should throw error if not initialized', () => {
      const uninitializedManager = new (ConfigurationManager as any)();
      
      expect(() => uninitializedManager.getConfig()).toThrow(
        'Configuration manager not initialized. Call initialize() first.'
      );
    });
  });

  describe('runtime overrides', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    it('should set runtime override', () => {
      configManager.setRuntimeOverride('logLevel', 'debug');
      
      const summary = configManager.getConfigurationSummary() as any;
      expect(summary.runtimeOverrides).toContain('logLevel');
    });

    it('should remove runtime override', () => {
      configManager.setRuntimeOverride('logLevel', 'debug');
      configManager.removeRuntimeOverride('logLevel');
      
      const summary = configManager.getConfigurationSummary() as any;
      expect(summary.runtimeOverrides).not.toContain('logLevel');
    });

    it('should clear all runtime overrides', () => {
      configManager.setRuntimeOverride('logLevel', 'debug');
      configManager.setRuntimeOverride('requestTimeout', 60000);
      configManager.clearRuntimeOverrides();
      
      const summary = configManager.getConfigurationSummary() as any;
      expect(summary.runtimeOverrides).toHaveLength(0);
    });

    it('should apply runtime override with expiry', () => {
      const futureDate = new Date(Date.now() + 10000);
      configManager.setRuntimeOverride('logLevel', 'debug', { expiry: futureDate });
      
      const summary = configManager.getConfigurationSummary() as any;
      expect(summary.runtimeOverrides).toContain('logLevel');
    });
  });

  describe('source management', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    it('should add new configuration source', () => {
      const newSource = new FileConfigSource('./new-config.json');
      configManager.addSource(newSource);
      
      const summary = configManager.getConfigurationSummary() as any;
      expect(summary.sources).toContain('file');
    });

    it('should remove configuration source', () => {
      configManager.removeSource('file');
      
      const summary = configManager.getConfigurationSummary() as any;
      expect(summary.sources).not.toContain('file');
    });
  });

  describe('configuration reload', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    it('should reload configuration successfully', async () => {
      await expect(configManager.reloadConfiguration()).resolves.not.toThrow();
    });

    it('should handle reload errors gracefully', async () => {
      vi.mocked(mockEnvironmentValidator.getValidatedConfig).mockImplementation(() => {
        throw new Error('Validation failed');
      });

      await expect(configManager.reloadConfiguration()).rejects.toThrow('Validation failed');
    });
  });

  describe('configuration export', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    it('should export configuration to file', async () => {
      const exportPath = './exported-config.json';
      
      mockFs.promises.writeFile = vi.fn().mockResolvedValue(undefined);
      
      await configManager.exportConfiguration(exportPath);
      
      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        exportPath,
        expect.stringContaining('"geminiApiKey"'),
        'utf-8'
      );
    });
  });
});

describe('EnvironmentConfigSource', () => {
  let source: EnvironmentConfigSource;

  beforeEach(() => {
    source = new EnvironmentConfigSource();
    
    vi.mocked(mockEnvironmentValidator.getValidatedConfig).mockReturnValue({
      geminiApiKey: 'test-key',
      nodeEnv: 'test',
    } as any);
  });

  it('should have correct properties', () => {
    expect(source.name).toBe('environment');
    expect(source.priority).toBe(3); // ConfigSourcePriority.ENVIRONMENT
  });

  it('should load environment configuration', async () => {
    const config = await source.load();
    
    expect(config).toBeDefined();
    expect(config.geminiApiKey).toBe('test-key');
    expect(mockEnvironmentValidator.getValidatedConfig).toHaveBeenCalled();
  });
});

describe('FileConfigSource', () => {
  let source: FileConfigSource;
  const testFilePath = './test-file-config.json';

  beforeEach(() => {
    source = new FileConfigSource(testFilePath);
  });

  it('should have correct properties', () => {
    expect(source.name).toBe('file');
    expect(source.priority).toBe(2); // ConfigSourcePriority.CONFIG_FILE
  });

  it('should load configuration from existing file', async () => {
    const testConfig = { logLevel: 'debug', requestTimeout: 60000 };
    
    vi.mocked(mockFs.existsSync).mockReturnValue(true);
    vi.mocked(mockFs.promises.readFile).mockResolvedValue(JSON.stringify(testConfig));
    
    const config = await source.load();
    
    expect(config).toEqual(testConfig);
    expect(mockFs.promises.readFile).toHaveBeenCalledWith(testFilePath, 'utf-8');
  });

  it('should return empty config for non-existent file', async () => {
    vi.mocked(mockFs.existsSync).mockReturnValue(false);
    
    const config = await source.load();
    
    expect(config).toEqual({});
  });

  it('should handle file read errors gracefully', async () => {
    vi.mocked(mockFs.existsSync).mockReturnValue(true);
    vi.mocked(mockFs.promises.readFile).mockRejectedValue(new Error('Read error'));
    
    const config = await source.load();
    
    expect(config).toEqual({});
  });

  it('should save configuration to file', async () => {
    const testConfig = { logLevel: 'debug' };
    
    mockFs.promises.mkdir = vi.fn().mockResolvedValue(undefined);
    mockFs.promises.writeFile = vi.fn().mockResolvedValue(undefined);
    
    await source.save!(testConfig);
    
    expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
      testFilePath,
      JSON.stringify(testConfig, null, 2),
      'utf-8'
    );
  });
});

describe('DefaultConfigSource', () => {
  let source: DefaultConfigSource;

  beforeEach(() => {
    source = new DefaultConfigSource();
  });

  it('should have correct properties', () => {
    expect(source.name).toBe('defaults');
    expect(source.priority).toBe(1); // ConfigSourcePriority.DEFAULT
  });

  it('should load empty default configuration', async () => {
    const config = await source.load();
    expect(config).toEqual({});
  });
});
