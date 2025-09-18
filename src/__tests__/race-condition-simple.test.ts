import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConversationManager } from '../services/conversation-manager.js';
import type { ClaudeCodeContext } from '../models/types.js';

describe('Race Condition Prevention - Simple Test', () => {
  let manager: ConversationManager;
  let sessionId: string;

  beforeEach(() => {
    manager = new ConversationManager();
    
    const context: ClaudeCodeContext = {
      attemptedApproaches: ['test approach'],
      partialFindings: [],
      stuckPoints: ['test stuck point'],
      focusArea: {
        files: ['test.ts'],
        entryPoints: []
      },
      analysisBudgetRemaining: 100
    };
    
    sessionId = manager.createSession(context);
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
  });

  it('should allow only one lock acquisition at a time', async () => {
    // Simulate concurrent lock attempts
    const results = await Promise.all([
      manager.acquireLock(sessionId),
      manager.acquireLock(sessionId),
      manager.acquireLock(sessionId)
    ]);
    
    // Only one should succeed initially
    const successCount = results.filter(r => r === true).length;
    expect(successCount).toBe(1);
    
    // Release the lock
    manager.releaseLock(sessionId);
    
    // Should be able to acquire again
    const nextResult = await manager.acquireLock(sessionId);
    expect(nextResult).toBe(true);
  });

  it('should handle sequential lock acquisition properly', async () => {
    // First lock should succeed
    const first = await manager.acquireLock(sessionId);
    expect(first).toBe(true);
    
    // Second lock should be queued and pending
    const secondPromise = manager.acquireLock(sessionId);
    
    // Release first lock
    manager.releaseLock(sessionId);
    
    // Second lock should now succeed
    const second = await secondPromise;
    expect(second).toBe(true);
  });
});