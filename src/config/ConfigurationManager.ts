/**
 * @fileoverview Unified Configuration Management System
 * 
 * This module provides a centralized configuration management system that builds
 * upon the EnvironmentValidator foundation. It implements the Strategy pattern
 * for different configuration sources and provides a clean, unified interface
 * for accessing configuration throughout the application.
 * 
 * Key features:
 * - Multiple configuration sources (environment, files, defaults)
 * - Runtime configuration updates
 * - Configuration validation and type safety
 * - Configuration change notifications
 * - Hierarchical configuration management
 * 
 * @author Deep Code Reasoning MCP Server
 * @version 1.0.0
 * @since 2025-01-09
 */

import { IEnvironmentConfig, EnvironmentValidator } from '@utils/EnvironmentValidator.js';
import { Logger } from '@utils/Logger.js';
import { EventEmitter } from 'events';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Configuration source priorities (higher number = higher priority)
 */
export enum ConfigSourcePriority {
  DEFAULT = 1,
  CONFIG_FILE = 2,
  ENVIRONMENT = 3,
  RUNTIME = 4,
}

/**
 * Interface for configuration sources
 */
export interface IConfigurationSource {
  readonly name: string;
  readonly priority: ConfigSourcePriority;
  load(): Promise<Partial<IEnvironmentConfig>>;
  save?(config: Partial<IEnvironmentConfig>): Promise<void>;
  watch?(callback: (changes: Partial<IEnvironmentConfig>) => void): void;
}

/**
 * Configuration change event
 */
export interface IConfigurationChange {
  source: string;
  changes: Partial<IEnvironmentConfig>;
  timestamp: Date;
  previousValue?: any;
  newValue?: any;
  path: string;
}

/**
 * Runtime configuration override interface
 */
export interface IRuntimeConfigOverride {
  path: string;
  value: any;
  expiry?: Date;
  reason?: string;
}

/**
 * Environment configuration source
 */
export class EnvironmentConfigSource implements IConfigurationSource {
  readonly name = 'environment';
  readonly priority = ConfigSourcePriority.ENVIRONMENT;

  async load(): Promise<Partial<IEnvironmentConfig>> {
    // Delegate to EnvironmentValidator for environment variable parsing
    const config = EnvironmentValidator.getValidatedConfig();
    return config;
  }
}

/**
 * File-based configuration source
 */
export class FileConfigSource implements IConfigurationSource {
  readonly name = 'file';
  readonly priority = ConfigSourcePriority.CONFIG_FILE;
  
  private readonly logger = new Logger('[ConfigFile]');
  private readonly filePath: string;
  private watchCallback?: (changes: Partial<IEnvironmentConfig>) => void;

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
  }

  async load(): Promise<Partial<IEnvironmentConfig>> {
    try {
      if (!fs.existsSync(this.filePath)) {
        this.logger.debug(`Configuration file not found: ${this.filePath}`);
        return {};
      }

      const content = await fs.promises.readFile(this.filePath, 'utf-8');
      const config = JSON.parse(content);
      
      this.logger.debug(`Loaded configuration from ${this.filePath}`);
      return config;
    } catch (error) {
      this.logger.warn(`Failed to load configuration file ${this.filePath}:`, error);
      return {};
    }
  }

  async save(config: Partial<IEnvironmentConfig>): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      await fs.promises.mkdir(dir, { recursive: true });
      
      const content = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(this.filePath, content, 'utf-8');
      
      this.logger.info(`Saved configuration to ${this.filePath}`);
    } catch (error) {
      this.logger.error(`Failed to save configuration to ${this.filePath}:`, error);
      throw error;
    }
  }

  watch(callback: (changes: Partial<IEnvironmentConfig>) => void): void {
    this.watchCallback = callback;
    
    if (fs.existsSync(this.filePath)) {
      fs.watchFile(this.filePath, { interval: 1000 }, async () => {
        try {
          const changes = await this.load();
          callback(changes);
        } catch (error) {
          this.logger.error('Error watching configuration file:', error);
        }
      });
    }
  }
}

/**
 * Default configuration source
 */
export class DefaultConfigSource implements IConfigurationSource {
  readonly name = 'defaults';
  readonly priority = ConfigSourcePriority.DEFAULT;

  async load(): Promise<Partial<IEnvironmentConfig>> {
    // Return the default configuration from EnvironmentValidator
    return {};
  }
}

/**
 * Unified Configuration Manager
 * 
 * Provides centralized configuration management with multiple sources,
 * runtime updates, validation, and change notifications.
 */
export class ConfigurationManager extends EventEmitter {
  private static instance: ConfigurationManager;
  private readonly logger = new Logger('[ConfigManager]');
  private readonly sources = new Map<string, IConfigurationSource>();
  private currentConfig: IEnvironmentConfig;
  private runtimeOverrides = new Map<string, IRuntimeConfigOverride>();
  private initialized = false;

  private constructor() {
    super();
    this.currentConfig = {} as IEnvironmentConfig;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Initialize the configuration manager with sources
   */
  async initialize(sources: IConfigurationSource[] = []): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Configuration manager already initialized');
      return;
    }

    // Add default sources if none provided
    if (sources.length === 0) {
      sources = [
        new DefaultConfigSource(),
        new FileConfigSource('./config/server.json'),
        new EnvironmentConfigSource(),
      ];
    }

    // Register sources
    for (const source of sources) {
      this.addSource(source);
    }

    // Load initial configuration
    await this.reloadConfiguration();

    // Setup file watching
    this.setupFileWatching();

    this.initialized = true;
    this.logger.info('Configuration manager initialized');
  }

  /**
   * Add a configuration source
   */
  addSource(source: IConfigurationSource): void {
    this.sources.set(source.name, source);
    this.logger.debug(`Added configuration source: ${source.name} (priority: ${source.priority})`);
  }

  /**
   * Remove a configuration source
   */
  removeSource(sourceName: string): void {
    this.sources.delete(sourceName);
    this.logger.debug(`Removed configuration source: ${sourceName}`);
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<IEnvironmentConfig> {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized. Call initialize() first.');
    }
    return Object.freeze({ ...this.currentConfig });
  }

  /**
   * Get a specific configuration value with type safety
   */
  get<K extends keyof IEnvironmentConfig>(key: K): IEnvironmentConfig[K] {
    return this.getConfig()[key];
  }

  /**
   * Set a runtime configuration override
   */
  setRuntimeOverride(path: string, value: any, options?: {
    expiry?: Date;
    reason?: string;
  }): void {
    const override: IRuntimeConfigOverride = {
      path,
      value,
      expiry: options?.expiry,
      reason: options?.reason,
    };

    this.runtimeOverrides.set(path, override);
    this.logger.info(`Set runtime override for ${path}: ${JSON.stringify(value)}`);
    
    // Trigger configuration reload to apply override
    this.applyRuntimeOverrides();
    this.emitConfigurationChange({
      source: 'runtime',
      changes: { [path]: value },
      timestamp: new Date(),
      newValue: value,
      path,
    });
  }

  /**
   * Remove a runtime configuration override
   */
  removeRuntimeOverride(path: string): void {
    const override = this.runtimeOverrides.get(path);
    if (override) {
      this.runtimeOverrides.delete(path);
      this.logger.info(`Removed runtime override for ${path}`);
      
      // Reload configuration to remove override effect
      this.reloadConfiguration();
    }
  }

  /**
   * Clear all runtime overrides
   */
  clearRuntimeOverrides(): void {
    this.runtimeOverrides.clear();
    this.logger.info('Cleared all runtime overrides');
    this.reloadConfiguration();
  }

  /**
   * Reload configuration from all sources
   */
  async reloadConfiguration(): Promise<void> {
    try {
      const sourceConfigs = new Map<string, Partial<IEnvironmentConfig>>();

      // Load from all sources
      for (const [name, source] of this.sources) {
        try {
          const config = await source.load();
          sourceConfigs.set(name, config);
          this.logger.debug(`Loaded config from ${name}: ${Object.keys(config).length} keys`);
        } catch (error) {
          this.logger.error(`Failed to load config from ${name}:`, error);
        }
      }

      // Merge configurations by priority
      const mergedConfig = this.mergeConfigurations(sourceConfigs);

      // Apply runtime overrides
      const finalConfig = this.applyRuntimeOverridesTo(mergedConfig);

      // Validate the final configuration
      const validatedConfig = this.validateConfiguration(finalConfig);

      const previousConfig = this.currentConfig;
      this.currentConfig = validatedConfig;

      // Emit change event if configuration changed
      if (JSON.stringify(previousConfig) !== JSON.stringify(validatedConfig)) {
        this.emitConfigurationChange({
          source: 'reload',
          changes: validatedConfig,
          timestamp: new Date(),
          previousValue: previousConfig,
          newValue: validatedConfig,
          path: 'root',
        });
      }

      this.logger.debug('Configuration reloaded successfully');
    } catch (error) {
      this.logger.error('Failed to reload configuration:', error);
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(config: any): IEnvironmentConfig {
    try {
      // Use EnvironmentValidator for validation
      return EnvironmentValidator.getValidatedConfig();
    } catch (error) {
      this.logger.error('Configuration validation failed:', error);
      throw new Error(`Invalid configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Merge configurations by priority
   */
  private mergeConfigurations(sourceConfigs: Map<string, Partial<IEnvironmentConfig>>): Partial<IEnvironmentConfig> {
    const sources = Array.from(this.sources.values()).sort((a, b) => a.priority - b.priority);
    let merged: Partial<IEnvironmentConfig> = {};

    for (const source of sources) {
      const config = sourceConfigs.get(source.name);
      if (config) {
        merged = { ...merged, ...config };
      }
    }

    return merged;
  }

  /**
   * Apply runtime overrides to configuration
   */
  private applyRuntimeOverrides(): void {
    const config = { ...this.currentConfig };
    this.currentConfig = this.applyRuntimeOverridesTo(config);
  }

  /**
   * Apply runtime overrides to a configuration object
   */
  private applyRuntimeOverridesTo(config: any): any {
    const result = { ...config };

    for (const [path, override] of this.runtimeOverrides) {
      // Check if override has expired
      if (override.expiry && override.expiry < new Date()) {
        this.runtimeOverrides.delete(path);
        continue;
      }

      // Apply override using dot notation path
      this.setValueByPath(result, path, override.value);
    }

    return result;
  }

  /**
   * Set a value using dot notation path
   */
  private setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Setup file watching for configuration sources
   */
  private setupFileWatching(): void {
    for (const source of this.sources.values()) {
      if (source.watch) {
        source.watch((changes) => {
          this.logger.debug(`Configuration changed in ${source.name}`);
          this.reloadConfiguration();
        });
      }
    }
  }

  /**
   * Emit configuration change event
   */
  private emitConfigurationChange(change: IConfigurationChange): void {
    this.emit('configurationChanged', change);
    this.logger.debug(`Configuration changed: ${change.source} -> ${change.path}`);
  }

  /**
   * Get configuration summary for debugging
   */
  getConfigurationSummary(): object {
    return {
      initialized: this.initialized,
      sources: Array.from(this.sources.keys()),
      runtimeOverrides: Array.from(this.runtimeOverrides.keys()),
      configKeys: Object.keys(this.currentConfig).length,
    };
  }

  /**
   * Export current configuration to file
   */
  async exportConfiguration(filePath: string): Promise<void> {
    try {
      const config = this.getConfig();
      const content = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(filePath, content, 'utf-8');
      this.logger.info(`Exported configuration to ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to export configuration to ${filePath}:`, error);
      throw error;
    }
  }
}

// Export singleton instance for convenience
export const configManager = ConfigurationManager.getInstance();
