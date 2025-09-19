# Cross-Workspace Analysis Guide

## Overview

The Deep Code Reasoning MCP Server supports cross-workspace analysis, allowing you to analyze code files in different repositories and directories outside the current project. This feature is particularly useful when:

- Debugging issues that span multiple microservices
- Analyzing dependencies between different repositories
- Performing architecture reviews across multiple projects
- Understanding integration patterns between services

## Security Model

### Allowed Paths

Cross-workspace analysis is restricted to development-safe directories to maintain security:

- `/home/*` - User home directories
- `/Users/*` - macOS user directories  
- `/workspace/*` - Common container workspace paths
- `/project/*` - Common container project paths
- `/src/*` - Common source code directories
- `$HOME/*` - Environment-specific home directory

### Blocked Operations

The following are explicitly blocked for security:

- **Path Traversal**: Any path containing `..` or `~` characters
- **System Files**: Access to `/etc/passwd`, `/etc/shadow`, `/proc/`, `/sys/`, `/dev/`
- **Relative Path Escapes**: Relative paths that would escape the project boundary

### Security Examples

```typescript
// ✅ ALLOWED - Cross-workspace absolute paths
"/home/user/projects/service-a/src/api.py"
"/Users/developer/workspace/microservice-b/handler.js"

// ❌ BLOCKED - Path traversal attempts  
"../../../etc/passwd"
"~/../../root/.ssh/id_rsa"

// ❌ BLOCKED - System file access
"/etc/passwd"
"/proc/version"
```

## Usage Examples

### Analyzing External Repositories

```typescript
// Using trace_execution_path with external files
{
  "entryPoint": {
    "file": "/home/lucas_galdino/repositories/mcp_servers/mcp-server-Human-In-the-Loop-MCP-Server/human_loop_server.py",
    "functionName": "get_multiline_input",
    "line": 1200
  },
  "includeDataFlow": true,
  "maxDepth": 10
}
```

### Cross-System Impact Analysis

```typescript
// Analyzing changes across multiple services
{
  "changeScope": {
    "files": [
      "/home/user/projects/api-gateway/src/routes.js",
      "/home/user/projects/user-service/src/handlers.py",
      "/home/user/projects/shared-lib/src/types.ts"
    ],
    "serviceNames": ["api-gateway", "user-service"]
  },
  "impactTypes": ["breaking", "performance", "behavioral"]
}
```

### Hypothesis Testing Across Repositories

```typescript
// Testing theories that span multiple codebases
{
  "hypothesis": "Authentication middleware is inconsistently implemented across services",
  "codeScope": {
    "files": [
      "/home/user/projects/web-api/middleware/auth.js",
      "/home/user/projects/mobile-api/auth/middleware.py", 
      "/home/user/projects/admin-api/src/auth.ts"
    ]
  },
  "testApproach": "Compare authentication patterns and identify inconsistencies"
}
```

## Best Practices

### 1. Use Absolute Paths

Always use absolute paths when referencing files outside the current workspace:

```typescript
// ✅ Good - Absolute path
"/home/user/projects/external-service/src/main.py"

// ❌ Avoid - Relative path to external files
"../external-service/src/main.py"
```

### 2. Verify File Existence

Cross-workspace files may not always exist. Handle missing files gracefully:

```typescript
// The MCP tools will report file access errors clearly
// No special handling needed in your requests
```

### 3. Respect File Permissions

Ensure the MCP server process has read access to the target files:

```bash
# Check file permissions
ls -la /path/to/external/file

# Grant read access if needed
chmod +r /path/to/external/file
```

## Error Handling

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Security violation: Path traversal attempt detected` | Path contains `..` or `~` | Use absolute paths without traversal characters |
| `Security violation: Access denied to system path` | Attempting to access system files | Use development directories only |
| `Cannot read file: ENOENT` | File doesn't exist | Verify file path and existence |
| `Cannot read file: EACCES` | Permission denied | Check file permissions |

### Debugging Access Issues

1. **Verify the path is absolute**: `/full/path/to/file`
2. **Check file exists**: `ls -la /path/to/file`
3. **Verify permissions**: Ensure read access for the process user
4. **Check allowed prefixes**: Ensure path starts with allowed directory

## Configuration

### Environment Variables

Cross-workspace analysis can be controlled via environment variables:

```bash
# Enable/disable cross-workspace analysis (default: true)
export ENABLE_CROSS_WORKSPACE_ANALYSIS=true

# Additional allowed path prefixes (comma-separated)
export ADDITIONAL_ALLOWED_PATHS="/opt/projects,/var/workspace"
```

### Runtime Configuration

The security model is built into the `SecureCodeReader` class and cannot be bypassed at runtime for security reasons.

## Migration from Single-Workspace

If you're upgrading from a version that only supported single-workspace analysis:

1. **Update file paths**: Convert relative external paths to absolute paths
2. **Review security**: Ensure you're not accidentally exposing sensitive files
3. **Test thoroughly**: Verify cross-workspace analysis works as expected

## Security Considerations

- **Principle of Least Privilege**: Only grant access to directories you need to analyze
- **Regular Audits**: Periodically review which external paths are being accessed
- **Container Isolation**: Consider running the MCP server in a container with limited filesystem access
- **Log Monitoring**: Monitor logs for unexpected file access patterns

## Troubleshooting

### Common Issues

1. **"Path traversal detected"**: Remove `..` from your paths and use absolute paths
2. **"Access denied to system path"**: Ensure you're accessing development directories only
3. **"File not found"**: Verify the absolute path and file existence
4. **Permission errors**: Check file permissions and process user access

### Getting Help

If you encounter issues with cross-workspace analysis:

1. Check this documentation first
2. Review the error message carefully
3. Verify your paths follow the security model
4. Create an issue with a minimal reproduction case
