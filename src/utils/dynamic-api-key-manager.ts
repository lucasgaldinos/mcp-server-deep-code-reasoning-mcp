/**
 * Dynamic API Key Manager for VS Code Integration
 * Prompts users for API keys when needed, stores them temporarily,
 * and provides graceful fallbacks when keys are missing
 */

export interface ApiKeyConfig {
  geminiApiKey?: string;
  openaiApiKey?: string;
  lastUpdated?: Date;
  sessionOnly?: boolean;
}

export interface ProviderStatus {
  name: string;
  available: boolean;
  reason?: string;
  needsApiKey: boolean;
  promptForKey?: boolean;
}

/**
 * Manages API keys dynamically without requiring .env files
 * Integrates with VS Code to prompt users for credentials when needed
 */
export class DynamicApiKeyManager {
  private apiKeys: ApiKeyConfig = {};
  private keyPromptResults = new Map<string, { value: string; timestamp: number }>();
  private readonly sessionDuration = 2 * 60 * 60 * 1000; // 2 hours
  private readonly maxPromptAttempts = 3;
  private promptAttempts = new Map<string, number>();

  constructor() {
    this.initializeFromEnvironment();
  }

  /**
   * Initialize with any existing environment variables
   * But don't require them - they're optional
   */
  private initializeFromEnvironment(): void {
    // Only use environment variables if they exist, don't require them
    if (process.env.GEMINI_API_KEY) {
      this.apiKeys.geminiApiKey = process.env.GEMINI_API_KEY;
    }
    if (process.env.OPENAI_API_KEY) {
      this.apiKeys.openaiApiKey = process.env.OPENAI_API_KEY;
    }
    
    console.log('[API Keys] Initialized with optional environment variables');
    this.logKeyStatus();
  }

  /**
   * Get current API key configuration
   */
  getApiKeys(): ApiKeyConfig {
    // Clean up expired session keys
    this.cleanupExpiredKeys();
    return { ...this.apiKeys };
  }

  /**
   * Set API key for a provider (session only)
   */
  setApiKey(provider: 'gemini' | 'openai', apiKey: string, sessionOnly = true): void {
    const keyField = provider === 'gemini' ? 'geminiApiKey' : 'openaiApiKey';
    this.apiKeys[keyField] = apiKey;
    this.apiKeys.lastUpdated = new Date();
    this.apiKeys.sessionOnly = sessionOnly;

    if (sessionOnly) {
      this.keyPromptResults.set(provider, {
        value: apiKey,
        timestamp: Date.now()
      });
    }

    console.log(`[API Keys] ${provider} key set (${sessionOnly ? 'session only' : 'persistent'})`);
    this.logKeyStatus();
  }

  /**
   * Remove API key for a provider
   */
  removeApiKey(provider: 'gemini' | 'openai'): void {
    const keyField = provider === 'gemini' ? 'geminiApiKey' : 'openaiApiKey';
    delete this.apiKeys[keyField];
    this.keyPromptResults.delete(provider);
    this.promptAttempts.delete(provider);
    
    console.log(`[API Keys] ${provider} key removed`);
    this.logKeyStatus();
  }

  /**
   * Check provider availability and determine if prompting is needed
   */
  getProviderStatus(): ProviderStatus[] {
    const currentKeys = this.getApiKeys();
    
    return [
      {
        name: 'gemini',
        available: !!currentKeys.geminiApiKey,
        needsApiKey: true,
        promptForKey: !currentKeys.geminiApiKey && this.shouldPrompt('gemini'),
        reason: currentKeys.geminiApiKey ? undefined : 'API key required'
      },
      {
        name: 'openai',
        available: !!currentKeys.openaiApiKey,
        needsApiKey: true,
        promptForKey: !currentKeys.openaiApiKey && this.shouldPrompt('openai'),
        reason: currentKeys.openaiApiKey ? undefined : 'API key required'
      },
      {
        name: 'github_copilot',
        available: true, // Always available in VS Code
        needsApiKey: false,
        promptForKey: false,
        reason: 'Integrated with VS Code'
      }
    ];
  }

  /**
   * Generate user-friendly instructions for setting up API keys
   */
  getSetupInstructions(): {
    providers: Array<{
      name: string;
      status: string;
      instructions: string[];
      costInfo: string;
      signupUrl: string;
    }>;
    quickStart: string[];
  } {
    const status = this.getProviderStatus();
    
    return {
      providers: [
        {
          name: 'Gemini (Google)',
          status: status.find(s => s.name === 'gemini')?.available ? 'Available' : 'Needs API key',
          instructions: [
            '1. Go to Google AI Studio (https://aistudio.google.com/)',
            '2. Create a free account',
            '3. Generate an API key',
            '4. Use set_model tool: "gemini/gemini-2.5-flash"'
          ],
          costInfo: 'Free tier: 15 requests/minute, then $1.25-$10 per 1M tokens',
          signupUrl: 'https://aistudio.google.com/'
        },
        {
          name: 'OpenAI',
          status: status.find(s => s.name === 'openai')?.available ? 'Available' : 'Needs API key',
          instructions: [
            '1. Go to OpenAI Platform (https://platform.openai.com/)',
            '2. Create an account and add billing',
            '3. Generate an API key',
            '4. Use set_model tool: "openai/gpt-4-turbo"'
          ],
          costInfo: 'Pay-as-you-go: $5-$30 per 1M tokens depending on model',
          signupUrl: 'https://platform.openai.com/'
        },
        {
          name: 'GitHub Copilot',
          status: 'Always available',
          instructions: [
            '1. Already integrated with VS Code',
            '2. No additional setup required',
            '3. Use set_model tool: "github_copilot/copilot-chat"'
          ],
          costInfo: 'Free with GitHub Copilot subscription',
          signupUrl: 'https://github.com/features/copilot'
        }
      ],
      quickStart: [
        '🚀 Quick Start Options:',
        '1. Use GitHub Copilot (no setup): set_model with "github_copilot/copilot-chat"',
        '2. Get free Gemini key: Visit https://aistudio.google.com/',
        '3. For best quality: Get OpenAI key at https://platform.openai.com/',
        '4. All providers work without .env files - just run the tools!'
      ]
    };
  }

  /**
   * Generate prompt message for VS Code user input
   */
  generateApiKeyPrompt(provider: 'gemini' | 'openai'): {
    title: string;
    prompt: string;
    placeholder: string;
    instructions: string[];
  } {
    const info = {
      gemini: {
        title: 'Gemini API Key Required',
        prompt: 'Enter your Google Gemini API key to enable AI analysis:',
        placeholder: 'AIza...',
        instructions: [
          'Get a free API key at: https://aistudio.google.com/',
          'Free tier: 15 requests/minute',
          'Best for: Large documents, multimodal analysis'
        ]
      },
      openai: {
        title: 'OpenAI API Key Required',
        prompt: 'Enter your OpenAI API key to enable GPT analysis:',
        placeholder: 'sk-...',
        instructions: [
          'Get an API key at: https://platform.openai.com/',
          'Requires billing setup',
          'Best for: Advanced reasoning, general purpose'
        ]
      }
    };

    return info[provider];
  }

  /**
   * Handle the result of an API key prompt
   */
  handleApiKeyPromptResult(
    provider: 'gemini' | 'openai', 
    apiKey: string | null
  ): { success: boolean; message: string } {
    if (!apiKey || apiKey.trim() === '') {
      this.incrementPromptAttempts(provider);
      return {
        success: false,
        message: `No API key provided for ${provider}. You can still use other providers or try again later.`
      };
    }

    if (!this.validateApiKeyFormat(provider, apiKey)) {
      this.incrementPromptAttempts(provider);
      return {
        success: false,
        message: `Invalid API key format for ${provider}. Please check and try again.`
      };
    }

    this.setApiKey(provider, apiKey, true);
    return {
      success: true,
      message: `${provider} API key configured successfully! You can now use ${provider} models.`
    };
  }

  /**
   * Clean up expired session keys
   */
  private cleanupExpiredKeys(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [provider, result] of this.keyPromptResults.entries()) {
      if (now - result.timestamp > this.sessionDuration) {
        expired.push(provider);
      }
    }

    for (const provider of expired) {
      this.removeApiKey(provider as 'gemini' | 'openai');
      console.log(`[API Keys] Session key expired for ${provider}`);
    }
  }

  /**
   * Check if we should prompt for an API key
   */
  private shouldPrompt(provider: string): boolean {
    const attempts = this.promptAttempts.get(provider) || 0;
    return attempts < this.maxPromptAttempts;
  }

  /**
   * Increment prompt attempts for rate limiting
   */
  private incrementPromptAttempts(provider: string): void {
    const current = this.promptAttempts.get(provider) || 0;
    this.promptAttempts.set(provider, current + 1);
  }

  /**
   * Basic API key format validation
   */
  private validateApiKeyFormat(provider: 'gemini' | 'openai', apiKey: string): boolean {
    const patterns = {
      gemini: /^AIza[0-9A-Za-z_-]{35}$/,
      openai: /^sk-[A-Za-z0-9]{32,}$/
    };

    const pattern = patterns[provider];
    return pattern ? pattern.test(apiKey.trim()) : true;
  }

  /**
   * Log current API key status for debugging
   */
  private logKeyStatus(): void {
    const status = this.getProviderStatus();
    console.log('[API Keys] Provider Status:');
    status.forEach(s => {
      console.log(`  - ${s.name}: ${s.available ? '✅' : '❌'} ${s.reason || ''}`);
    });
  }

  /**
   * Get debug information about API key manager state
   */
  getDebugInfo(): {
    hasKeys: Record<string, boolean>;
    sessionKeys: string[];
    promptAttempts: Record<string, number>;
    sessionExpiry: string | null;
  } {
    const keys = this.getApiKeys();
    return {
      hasKeys: {
        gemini: !!keys.geminiApiKey,
        openai: !!keys.openaiApiKey
      },
      sessionKeys: Array.from(this.keyPromptResults.keys()),
      promptAttempts: Object.fromEntries(this.promptAttempts),
      sessionExpiry: keys.lastUpdated 
        ? new Date(keys.lastUpdated.getTime() + this.sessionDuration).toISOString()
        : null
    };
  }
}

// Global instance for the MCP server
export const apiKeyManager = new DynamicApiKeyManager();