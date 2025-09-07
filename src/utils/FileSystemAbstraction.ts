import type { CodeScope, CodeLocation } from '@models/types.js';

/**
 * FileSystem abstraction interface for dependency injection and testing
 */
export interface IFileSystemReader {
  /**
   * Read a single file
   */
  readFile(filePath: string): Promise<string>;

  /**
   * Read multiple files from a code scope
   */
  readCodeFiles(scope: CodeScope): Promise<Map<string, string>>;

  /**
   * Read code context around a specific location
   */
  readCodeContext(location: CodeLocation, contextLineCount?: number): Promise<string>;

  /**
   * Find related files based on patterns
   */
  findRelatedFiles(baseFile: string, patterns?: string[]): Promise<string[]>;

  /**
   * Check if a file exists
   */
  exists(filePath: string): Promise<boolean>;

  /**
   * Get file stats (size, modified time, etc.)
   */
  getStats(filePath: string): Promise<FileStats>;

  /**
   * Clear any internal caches
   */
  clearCache(): void;

  /**
   * Set cache TTL for file contents
   */
  setCacheTTL(ttlMs: number): void;
}

export interface FileStats {
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  modifiedTime: Date;
  createdTime: Date;
}

/**
 * Enhanced file system reader with caching, security, and performance features
 */
export class EnhancedFileSystemReader implements IFileSystemReader {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTTL: number = 60000; // 1 minute default
  private projectRoot: string;
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_EXTENSIONS = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h',
    '.json', '.yaml', '.yml', '.toml', '.xml',
    '.md', '.txt', '.gitignore', '.env.example',
  ]);

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = path.resolve(projectRoot);
  }

  setCacheTTL(ttlMs: number): void {
    this.cacheTTL = ttlMs;
  }

  async readFile(filePath: string): Promise<string> {
    // Check cache first
    const cacheKey = this.resolvePath(filePath);
    const cached = this.getCachedContent(cacheKey);
    if (cached) {
      return cached;
    }

    const absolutePath = await this.validatePath(filePath);

    try {
      const stats = await fs.stat(absolutePath);

      if (stats.size > this.MAX_FILE_SIZE) {
        throw new FileSystemError(
          `File too large: ${stats.size} bytes (max: ${this.MAX_FILE_SIZE})`,
          'FILE_TOO_LARGE',
          filePath,
          'read',
        );
      }

      const content = await fs.readFile(absolutePath, 'utf-8');
      this.setCachedContent(cacheKey, content);
      return content;
    } catch (error) {
      if (error instanceof FileSystemError) {
        throw error;
      }

      const code = (error as any).code || 'FS_ERROR';
      throw new FileSystemError(
        `Cannot read file ${filePath}: ${(error as Error).message}`,
        code,
        filePath,
        'read',
      );
    }
  }

  async readCodeFiles(scope: CodeScope): Promise<Map<string, string>> {
    const codeFiles = new Map<string, string>();
    const readPromises: Promise<void>[] = [];

    // Read all files in scope in parallel
    for (const file of scope.files) {
      readPromises.push(
        this.readFile(file)
          .then(content => {
            codeFiles.set(file, content);
          })
          .catch(error => {
            console.error(`Failed to read file ${file}:`, error);
          }),
      );
    }

    // Read entry point files if specified
    if (scope.entryPoints) {
      for (const entryPoint of scope.entryPoints) {
        if (!scope.files.includes(entryPoint.file)) {
          readPromises.push(
            this.readFile(entryPoint.file)
              .then(content => {
                codeFiles.set(entryPoint.file, content);
              })
              .catch(error => {
                console.error(`Failed to read entry point ${entryPoint.file}:`, error);
              }),
          );
        }
      }
    }

    await Promise.all(readPromises);
    return codeFiles;
  }

  async readCodeContext(location: CodeLocation, contextLineCount: number = 50): Promise<string> {
    const content = await this.readFile(location.file);
    const lines = content.split('\n');

    const startLine = Math.max(0, location.line - contextLineCount);
    const endLine = Math.min(lines.length, location.line + contextLineCount);

    const selectedLines = lines.slice(startLine, endLine);

    return selectedLines.map((line: string, index: number) =>
      `${startLine + index + 1}: ${line}`,
    ).join('\n');
  }

  async findRelatedFiles(baseFile: string, patterns: string[] = []): Promise<string[]> {
    const relatedFiles: string[] = [];
    const absoluteBaseFile = await this.validatePath(baseFile);
    const dir = path.dirname(absoluteBaseFile);
    const baseName = path.basename(absoluteBaseFile, path.extname(absoluteBaseFile));

    try {
      const files = await fs.readdir(dir);

      const checkPromises = files.map(async (file) => {
        const filePath = path.join(dir, file);

        try {
          const stats = await fs.stat(filePath);
          if (!stats.isFile()) return;

          // Check if it's a related file
          if (this.isRelatedFile(file, baseName, patterns)) {
            relatedFiles.push(filePath);
          }
        } catch (error) {
          // Skip files we can't access
        }
      });

      await Promise.all(checkPromises);
    } catch (error) {
      console.error(`Failed to find related files for ${baseFile}:`, error);
    }

    return relatedFiles;
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const absolutePath = await this.validatePath(filePath);
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  async getStats(filePath: string): Promise<FileStats> {
    const absolutePath = await this.validatePath(filePath);

    try {
      const stats = await fs.stat(absolutePath);
      return {
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        modifiedTime: stats.mtime,
        createdTime: stats.birthtime,
      };
    } catch (error) {
      const code = (error as any).code || 'FS_ERROR';
      throw new FileSystemError(
        `Cannot get stats for ${filePath}: ${(error as Error).message}`,
        code,
        filePath,
        'stat',
      );
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async validatePath(filePath: string): Promise<string> {
    const absolutePath = path.resolve(this.projectRoot, filePath);

    if (!absolutePath.startsWith(this.projectRoot + path.sep)) {
      throw new FileSystemError(
        `Security violation: Path traversal attempt detected for ${filePath}`,
        'PATH_TRAVERSAL',
        filePath,
        'validate',
      );
    }

    const ext = path.extname(absolutePath).toLowerCase();
    if (ext && !this.ALLOWED_EXTENSIONS.has(ext)) {
      throw new FileSystemError(
        `Security violation: File type not allowed: ${ext}`,
        'INVALID_FILE_TYPE',
        filePath,
        'validate',
      );
    }

    return absolutePath;
  }

  private resolvePath(filePath: string): string {
    return path.resolve(this.projectRoot, filePath);
  }

  private getCachedContent(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.content;
  }

  private setCachedContent(key: string, content: string): void {
    this.cache.set(key, {
      content,
      timestamp: Date.now(),
    });
  }

  private isRelatedFile(fileName: string, baseName: string, patterns: string[]): boolean {
    return (
      fileName.includes(baseName) ||
      fileName.includes(`${baseName}.test`) ||
      fileName.includes(`${baseName}.spec`) ||
      fileName.includes(`${baseName}Service`) ||
      fileName.includes(`${baseName}Controller`) ||
      patterns.some(pattern => fileName.includes(pattern))
    );
  }
}

interface CacheEntry {
  content: string;
  timestamp: number;
}

// Import statements for Node.js modules
import fs from 'fs/promises';
import path from 'path';
import { FileSystemError } from '@errors/index.js';
