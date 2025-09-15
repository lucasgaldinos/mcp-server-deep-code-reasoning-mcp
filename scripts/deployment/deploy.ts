#!/usr/bin/env tsx
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Environment = 'local' | 'staging' | 'production';

interface DeploymentConfig {
  environment: Environment;
  dockerTag: string;
  port: number;
  envFile: string;
}

/**
 * Deployment automation script for MCP Server
 */
class DeploymentManager {
  private rootPath: string;

  constructor() {
    this.rootPath = path.resolve(__dirname, '../..');
  }

  async deploy(environment: Environment): Promise<void> {
    console.log(`🚀 Starting deployment for ${environment} environment...`);

    const config = this.getDeploymentConfig(environment);
    
    try {
      // Validate prerequisites
      await this.validatePrerequisites();
      
      // Build the application
      await this.buildApplication();
      
      // Build Docker image
      await this.buildDockerImage(config);
      
      // Deploy based on environment
      await this.deployToEnvironment(config);
      
      console.log(`✅ Deployment to ${environment} completed successfully!`);
    } catch (error) {
      console.error(`❌ Deployment failed:`, error);
      process.exit(1);
    }
  }

  private getDeploymentConfig(environment: Environment): DeploymentConfig {
    const configs: Record<Environment, DeploymentConfig> = {
      local: {
        environment: 'local',
        dockerTag: 'mcp-deep-code-reasoning:local',
        port: 3000,
        envFile: '.env.local'
      },
      staging: {
        environment: 'staging',
        dockerTag: 'mcp-deep-code-reasoning:staging',
        port: 3001,
        envFile: '.env.staging'
      },
      production: {
        environment: 'production',
        dockerTag: 'mcp-deep-code-reasoning:latest',
        port: 3002,
        envFile: '.env.production'
      }
    };

    return configs[environment];
  }

  private async validatePrerequisites(): Promise<void> {
    console.log('🔍 Validating prerequisites...');
    
    // Check if Docker is available
    try {
      await this.runCommand('docker', ['--version']);
    } catch (error) {
      throw new Error('Docker is not available. Please install Docker.');
    }

    // Check if required files exist
    const requiredFiles = ['package.json', 'Dockerfile', 'tsconfig.json'];
    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(this.rootPath, file))) {
        throw new Error(`Required file ${file} not found`);
      }
    }

    console.log('✅ Prerequisites validated');
  }

  private async buildApplication(): Promise<void> {
    console.log('🔨 Building application...');
    
    await this.runCommand('npm', ['run', 'build'], { cwd: this.rootPath });
    
    console.log('✅ Application built successfully');
  }

  private async buildDockerImage(config: DeploymentConfig): Promise<void> {
    console.log(`🐳 Building Docker image: ${config.dockerTag}...`);
    
    const buildArgs = [
      'build',
      '-t', config.dockerTag,
      '--build-arg', `NODE_ENV=${config.environment}`,
      '.'
    ];

    await this.runCommand('docker', buildArgs, { cwd: this.rootPath });
    
    console.log('✅ Docker image built successfully');
  }

  private async deployToEnvironment(config: DeploymentConfig): Promise<void> {
    console.log(`📦 Deploying to ${config.environment}...`);

    switch (config.environment) {
      case 'local':
        await this.deployLocal(config);
        break;
      case 'staging':
        await this.deployStaging(config);
        break;
      case 'production':
        await this.deployProduction(config);
        break;
    }
  }

  private async deployLocal(config: DeploymentConfig): Promise<void> {
    // Stop existing container if running
    try {
      await this.runCommand('docker', ['stop', 'mcp-deep-code-reasoning-local']);
      await this.runCommand('docker', ['rm', 'mcp-deep-code-reasoning-local']);
    } catch (error) {
      // Container might not exist, continue
    }

    // Run new container
    const runArgs = [
      'run',
      '-d',
      '--name', 'mcp-deep-code-reasoning-local',
      '-p', `${config.port}:3000`,
      '--env-file', path.join(this.rootPath, config.envFile),
      config.dockerTag
    ];

    await this.runCommand('docker', runArgs);
    console.log(`✅ Local deployment running on port ${config.port}`);
  }

  private async deployStaging(config: DeploymentConfig): Promise<void> {
    console.log('🚧 Staging deployment not yet implemented');
    // TODO: Implement staging deployment (e.g., to staging server)
  }

  private async deployProduction(config: DeploymentConfig): Promise<void> {
    console.log('🏭 Production deployment not yet implemented');
    // TODO: Implement production deployment (e.g., to production cluster)
  }

  private runCommand(command: string, args: string[], options: { cwd?: string } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        cwd: options.cwd || process.cwd(),
        shell: true
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }
}

// CLI handling
const environment = process.argv[2] as Environment;

if (!environment || !['local', 'staging', 'production'].includes(environment)) {
  console.error('❌ Usage: tsx deploy.ts <local|staging|production>');
  process.exit(1);
}

const deployer = new DeploymentManager();
deployer.deploy(environment);