# VS Code MCP Integration Troubleshooting Guide

## Common Integration Issues and Solutions

### 1. Server Initialization Failures

#### Problem: "Invalid argument '--original-project'"

**Cause**: Incorrect uvx command arguments in mcp.json configuration
**Solution**: Remove invalid arguments and use proper uvx syntax

#### Problem: "ModuleNotFoundError: No module named 'tkinter'"

**Cause**: Missing system dependency for GUI components
**Solution**: Install tkinter based on your system:

**Ubuntu/Debian:**

```bash
sudo apt-get update
sudo apt-get install python3-tk
```

**Fedora/RHEL:**

```bash
sudo dnf install python3-tkinter
```

**Arch Linux:**

```bash
sudo pacman -S tk
```

**Test Installation:**

```bash
python3 -c "import tkinter; print('tkinter is available')"
```

### 2. Deep Code Reasoning Server Configuration

#### Current Working Configuration

The `.vscode/mcp.json` in this repository is correctly configured:

```json
{
    "inputs": [
        {
            "type": "promptString",
            "id": "geminiApiKey",
            "description": "Enter your Gemini API Key",
            "password": true
        }
    ],
    "servers": {
        "deep-code-reasoning": {
            "command": "node",
            "args": [
                "${workspaceFolder}/dist/src/index.js"
            ],
            "cwd": "${workspaceFolder}",
            "env": {
                "GEMINI_API_KEY": "${input:geminiApiKey}"
            }
        }
    }
}
```

#### Setup Steps

1. **Build the project**: `npm run build`
2. **Set GEMINI_API_KEY**: Obtain API key from Google AI Studio
3. **Restart VS Code**: Reload MCP configuration
4. **Test integration**: Try using MCP tools in Copilot Chat

### 3. Multi-Server Configuration Example

If you want to configure multiple MCP servers (e.g., Human-in-the-Loop + Deep Code Reasoning), use this template:

```json
{
    "inputs": [
        {
            "type": "promptString",
            "id": "geminiApiKey",
            "description": "Enter your Gemini API Key",
            "password": true
        }
    ],
    "servers": {
        "human-in-the-loop": {
            "command": "uvx",
            "args": [
                "--from",
                "/path/to/human-in-the-loop-server",
                "hitl-mcp-server"
            ],
            "type": "stdio"
        },
        "deep-code-reasoning": {
            "command": "node",
            "args": [
                "/path/to/deep-code-reasoning/dist/src/index.js"
            ],
            "cwd": "/path/to/deep-code-reasoning",
            "env": {
                "GEMINI_API_KEY": "${input:geminiApiKey}"
            }
        }
    }
}
```

### 4. Troubleshooting Steps

#### Verify Server Build

```bash
npm run build
node dist/src/index.js
```

Expected: Environment validation error (normal without API key)

#### Check VS Code MCP Logs

1. Open VS Code Output panel (View → Output)
2. Select "MCP" from dropdown
3. Look for initialization errors

#### Test Manual Server Start

```bash
# Set temporary API key for testing
export GEMINI_API_KEY="your-api-key-here"
node dist/src/index.js
```

#### Common Error Solutions

**Error: "Cannot find module"**

- Run `npm install` to ensure dependencies are installed
- Verify `dist/` directory exists after build

**Error: "GEMINI_API_KEY is not configured"**

- Obtain API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Configure in VS Code when prompted

**Error: "Server failed to start"**

- Check file permissions on `dist/src/index.js`
- Verify Node.js version compatibility (>=16.0.0)

### 5. Integration Validation

Once configured correctly, you should see these MCP tools available in VS Code Copilot Chat:

#### Deep Code Reasoning Tools (14 total)

- `health_check` - System health monitoring
- `health_summary` - Health status aggregation
- `get_model_info` - Model configuration display
- `set_model` - Model switching
- `hypothesis_test` - Deep semantic analysis
- `trace_execution_path` - Code execution tracing
- `performance_bottleneck` - Performance analysis
- `escalate_analysis` - Multi-model orchestration
- `start_conversation` - Begin conversational analysis
- `continue_conversation` - Continue analysis dialogue
- `finalize_conversation` - Complete analysis session
- `get_conversation_status` - Session management
- `run_hypothesis_tournament` - Parallel hypothesis testing
- `cross_system_impact` - Cross-system analysis

### 6. Performance Optimization

#### Reduce Startup Time

- Keep GEMINI_API_KEY in environment variables
- Use `npm run dev` for development with hot reload
- Configure VS Code to cache MCP server processes

#### Memory Management

- Monitor server memory usage in long sessions
- Restart VS Code if servers become unresponsive
- Use conversation finalization to clean up sessions

### 7. Security Considerations

#### API Key Protection

- Never commit API keys to version control
- Use VS Code's input prompts for secure key entry
- Consider using environment variables for local development

#### Network Security

- Ensure MCP server only accepts local connections
- Monitor API usage for unexpected requests
- Use rate limiting for production deployments

## Quick Reference

### Build Commands

```bash
npm run build          # Build project
npm run dev           # Development mode
npm test              # Run tests
npm run typecheck     # TypeScript validation
```

### Common Paths

- Configuration: `.vscode/mcp.json`
- Built server: `dist/src/index.js`
- Logs: VS Code Output → MCP
- Documentation: `docs/guides/`

### Support Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Google AI Studio](https://aistudio.google.com/)
- [VS Code MCP Extension](https://marketplace.visualstudio.com/items?itemName=microsoft.vscode-mcp)
