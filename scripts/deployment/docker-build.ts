#!/usr/bin/env tsx
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Docker build automation script
 */
class DockerBuilder {
  private rootPath: string;

  constructor() {
    this.rootPath = path.resolve(__dirname, '../..');
  }

  async build(): Promise<void> {
    console.log('🐳 Building Docker image for MCP Deep Code Reasoning Server...');

    try {
      // Validate Dockerfile exists
      await this.validateDockerfile();
      
      // Build the Docker image
      await this.buildImage();
      
      console.log('✅ Docker build completed successfully!');
    } catch (error) {
      console.error('❌ Docker build failed:', error);
      process.exit(1);
    }
  }

  private async validateDockerfile(): Promise<void> {
    const dockerfilePath = path.join(this.rootPath, 'Dockerfile');
    
    if (!fs.existsSync(dockerfilePath)) {
      throw new Error('Dockerfile not found in project root');
    }

    console.log('✅ Dockerfile found');
  }

  private async buildImage(): Promise<void> {
    const buildArgs = [
      'build',
      '-t', 'mcp-deep-code-reasoning:latest',
      '-t', 'mcp-deep-code-reasoning:dev',
      '--build-arg', 'NODE_ENV=production',
      '.'
    ];

    console.log('🔨 Building Docker image...');
    console.log(`Command: docker ${buildArgs.join(' ')}`);

    await this.runCommand('docker', buildArgs, { cwd: this.rootPath });
    
    console.log('✅ Docker image built with tags:');
    console.log('   - mcp-deep-code-reasoning:latest');
    console.log('   - mcp-deep-code-reasoning:dev');
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

// Run the build
const builder = new DockerBuilder();
builder.build();