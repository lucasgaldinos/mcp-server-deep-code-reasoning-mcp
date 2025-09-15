#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CleanupConfig {
  removeBackups: boolean;
  removeNodeModules: boolean;
  removeDist: boolean;
  removeLogFiles: boolean;
  removeTempFiles: boolean;
  dryRun: boolean;
}

/**
 * Repository cleanup and maintenance script
 */
class RepositoryCleanup {
  private rootPath: string;
  private deletedFiles: string[] = [];
  private deletedDirs: string[] = [];
  private totalSize: number = 0;

  constructor() {
    this.rootPath = path.resolve(__dirname, '../..');
  }

  async cleanup(config: CleanupConfig): Promise<void> {
    console.log('🧹 Starting repository cleanup...');
    if (config.dryRun) {
      console.log('📋 DRY RUN - No files will be deleted\n');
    }

    try {
      if (config.removeBackups) {
        await this.removeBackups(config.dryRun);
      }

      if (config.removeNodeModules) {
        await this.removeNodeModules(config.dryRun);
      }

      if (config.removeDist) {
        await this.removeDist(config.dryRun);
      }

      if (config.removeLogFiles) {
        await this.removeLogFiles(config.dryRun);
      }

      if (config.removeTempFiles) {
        await this.removeTempFiles(config.dryRun);
      }

      this.printSummary(config.dryRun);
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    }
  }

  private async removeBackups(dryRun: boolean): Promise<void> {
    console.log('🗂️  Removing backup directories...');
    
    const backupPatterns = [
      'docs-backup',
      '*.bak',
      '*.backup',
      '*~',
      '.#*'
    ];

    for (const pattern of backupPatterns) {
      await this.removeMatchingItems(pattern, dryRun);
    }
  }

  private async removeNodeModules(dryRun: boolean): Promise<void> {
    console.log('📦 Removing node_modules...');
    await this.removeDirectory('node_modules', dryRun);
  }

  private async removeDist(dryRun: boolean): Promise<void> {
    console.log('🏗️  Removing build artifacts...');
    
    const buildDirs = ['dist', 'build', '.tsbuildinfo'];
    for (const dir of buildDirs) {
      await this.removeDirectory(dir, dryRun);
    }
  }

  private async removeLogFiles(dryRun: boolean): Promise<void> {
    console.log('📜 Removing log files...');
    
    const logPatterns = [
      '*.log',
      'logs/',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*'
    ];

    for (const pattern of logPatterns) {
      await this.removeMatchingItems(pattern, dryRun);
    }
  }

  private async removeTempFiles(dryRun: boolean): Promise<void> {
    console.log('🗑️  Removing temporary files...');
    
    const tempPatterns = [
      '.DS_Store',
      'Thumbs.db',
      '*.tmp',
      '*.temp',
      '.cache/',
      '.parcel-cache/',
      '.next/',
      '.nuxt/',
      '.vuepress/dist'
    ];

    for (const pattern of tempPatterns) {
      await this.removeMatchingItems(pattern, dryRun);
    }
  }

  private async removeMatchingItems(pattern: string, dryRun: boolean): Promise<void> {
    const items = await this.findMatchingItems(pattern);
    
    for (const item of items) {
      const fullPath = path.join(this.rootPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        await this.removeDirectory(item, dryRun);
      } else {
        await this.removeFile(item, dryRun);
      }
    }
  }

  private async findMatchingItems(pattern: string): Promise<string[]> {
    // Simple pattern matching - in a real implementation, you'd use glob
    const items: string[] = [];
    
    try {
      const contents = fs.readdirSync(this.rootPath);
      
      for (const item of contents) {
        if (this.matchesPattern(item, pattern)) {
          items.push(item);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return items;
  }

  private matchesPattern(item: string, pattern: string): boolean {
    // Simple pattern matching
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(item);
    }
    return item === pattern;
  }

  private async removeDirectory(dirName: string, dryRun: boolean): Promise<void> {
    const dirPath = path.join(this.rootPath, dirName);
    
    if (!fs.existsSync(dirPath)) {
      return;
    }

    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      return;
    }

    const size = await this.getDirectorySize(dirPath);
    this.totalSize += size;

    if (dryRun) {
      console.log(`   Would remove directory: ${dirName} (${this.formatBytes(size)})`);
    } else {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`   Removed directory: ${dirName} (${this.formatBytes(size)})`);
    }
    
    this.deletedDirs.push(dirName);
  }

  private async removeFile(fileName: string, dryRun: boolean): Promise<void> {
    const filePath = path.join(this.rootPath, fileName);
    
    if (!fs.existsSync(filePath)) {
      return;
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      return;
    }

    this.totalSize += stat.size;

    if (dryRun) {
      console.log(`   Would remove file: ${fileName} (${this.formatBytes(stat.size)})`);
    } else {
      fs.unlinkSync(filePath);
      console.log(`   Removed file: ${fileName} (${this.formatBytes(stat.size)})`);
    }
    
    this.deletedFiles.push(fileName);
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let size = 0;
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          size += await this.getDirectorySize(itemPath);
        } else {
          size += stat.size;
        }
      }
    } catch (error) {
      // Can't read directory
    }
    
    return size;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private printSummary(dryRun: boolean): void {
    console.log('\n📊 Cleanup Summary:');
    console.log(`   Files ${dryRun ? 'to be removed' : 'removed'}: ${this.deletedFiles.length}`);
    console.log(`   Directories ${dryRun ? 'to be removed' : 'removed'}: ${this.deletedDirs.length}`);
    console.log(`   Total space ${dryRun ? 'to be freed' : 'freed'}: ${this.formatBytes(this.totalSize)}`);
    
    if (dryRun) {
      console.log('\n💡 Run without --dry-run to actually delete files');
    } else {
      console.log('\n✅ Cleanup completed successfully!');
    }
  }
}

// CLI handling
const args = process.argv.slice(2);
const config: CleanupConfig = {
  removeBackups: args.includes('--backups') || args.includes('--all'),
  removeNodeModules: args.includes('--node-modules') || args.includes('--all'),
  removeDist: args.includes('--dist') || args.includes('--all'),
  removeLogFiles: args.includes('--logs') || args.includes('--all'),
  removeTempFiles: args.includes('--temp') || args.includes('--all'),
  dryRun: args.includes('--dry-run')
};

// Default to all if no specific options provided
if (!config.removeBackups && !config.removeNodeModules && !config.removeDist && !config.removeLogFiles && !config.removeTempFiles) {
  config.removeBackups = true;
  config.removeLogFiles = true;
  config.removeTempFiles = true;
}

if (args.includes('--help')) {
  console.log(`
Repository Cleanup Script

Usage: tsx cleanup.ts [options]

Options:
  --all          Remove all cleanable items
  --backups      Remove backup directories and files
  --node-modules Remove node_modules directory
  --dist         Remove build artifacts (dist, build, .tsbuildinfo)
  --logs         Remove log files
  --temp         Remove temporary files
  --dry-run      Show what would be deleted without actually deleting
  --help         Show this help message

Examples:
  tsx cleanup.ts --all --dry-run    # See what would be deleted
  tsx cleanup.ts --backups --logs   # Clean backups and logs only
  tsx cleanup.ts                    # Clean backups, logs, and temp files
`);
  process.exit(0);
}

const cleanup = new RepositoryCleanup();
cleanup.cleanup(config);