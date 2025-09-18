import type { ClaudeCodeContext, DeepAnalysisResult } from '@models/types.js';
import { SessionError, SessionNotFoundError } from '@errors/index.js';
import { v4 as uuidv4 } from 'uuid';
import { ChatSession } from '@google/generative-ai';

export interface ConversationTurn {
  id: string;
  role: 'claude' | 'gemini' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    analysisType?: string;
    newFindings?: unknown[];
    questions?: string[];
  };
}

export interface ConversationState {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  status: 'active' | 'processing' | 'completing' | 'completed' | 'abandoned';
  context: ClaudeCodeContext;
  turns: ConversationTurn[];
  analysisProgress: {
    completedSteps: string[];
    pendingQuestions: string[];
    keyFindings: unknown[];
    confidenceLevel: number;
  };
  geminiSession?: ChatSession;
}

export class ConversationManager {
  private sessions: Map<string, ConversationState> = new Map();
  private sessionLocks: Map<string, Promise<void>> = new Map();
  private lockQueue: Map<string, Array<{ resolve: (value: boolean) => void; reject: (error: Error) => void }>> = new Map();
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_TURNS = 50;
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Clean up abandoned sessions periodically
    this.cleanupInterval = setInterval(() => this.cleanupAbandonedSessions(), 5 * 60 * 1000);
  }

  destroy(): void {
    // Clean up the interval when destroying the manager
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  createSession(context: ClaudeCodeContext): string {
    const sessionId = uuidv4();
    const now = Date.now();

    const state: ConversationState = {
      sessionId,
      startTime: now,
      lastActivity: now,
      status: 'active',
      context,
      turns: [],
      analysisProgress: {
        completedSteps: [],
        pendingQuestions: [],
        keyFindings: [],
        confidenceLevel: 0,
      },
    };

    this.sessions.set(sessionId, state);
    return sessionId;
  }

  getSession(sessionId: string): ConversationState | null {
    const session = this.sessions.get(sessionId);
    if (!session) {return null;}

    // Check if session has timed out
    if (Date.now() - session.lastActivity > this.SESSION_TIMEOUT_MS) {
      session.status = 'abandoned';
      return null;
    }

    return session;
  }

  /**
   * Acquire an exclusive lock on a session for processing.
   * Returns true if lock was acquired, false otherwise.
   * Uses queue-based atomic locking to prevent race conditions.
   */
  async acquireLock(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {return false;}

    // Check if session has timed out
    if (Date.now() - session.lastActivity > this.SESSION_TIMEOUT_MS) {
      session.status = 'abandoned';
      return false;
    }

    // Only acquire lock if session is active
    if (session.status !== 'active') {
      return false;
    }

    // Create queue-based atomic locking
    return new Promise<boolean>((resolve, reject) => {
      // Add to queue for this session
      if (!this.lockQueue.has(sessionId)) {
        this.lockQueue.set(sessionId, []);
      }
      
      const queue = this.lockQueue.get(sessionId)!;
      
      // If this is the first in queue and no active lock, acquire immediately
      if (queue.length === 0 && !this.sessionLocks.has(sessionId)) {
        this.processingLock(sessionId, resolve, reject);
      } else {
        // Add to queue to wait for turn
        queue.push({ resolve, reject });
      }
    });
  }

  /**
   * Process lock acquisition atomically
   */
  private processingLock(sessionId: string, resolve: (value: boolean) => void, reject: (error: Error) => void): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') {
      resolve(false);
      this.processNextInQueue(sessionId);
      return;
    }

    // Atomically set processing status and create lock
    session.status = 'processing';
    session.lastActivity = Date.now();
    
    // Create lock promise
    let lockResolver: (() => void) | undefined;
    const lockPromise = new Promise<void>((lockResolve) => {
      lockResolver = lockResolve;
    });
    
    // Store the resolver for releaseLock to call
    (lockPromise as any).resolve = lockResolver!;
    this.sessionLocks.set(sessionId, lockPromise);
    
    resolve(true);
  }

  /**
   * Process the next lock request in queue
   */
  private processNextInQueue(sessionId: string): void {
    const queue = this.lockQueue.get(sessionId);
    if (!queue || queue.length === 0) {
      this.lockQueue.delete(sessionId);
      return;
    }
    
    const next = queue.shift()!;
    this.processingLock(sessionId, next.resolve, next.reject);
  }

  /**
   * Release the processing lock on a session.
   * Resolves the Promise-based mutex and processes next in queue.
   */
  releaseLock(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'processing') {
      session.status = 'active';
      session.lastActivity = Date.now();
      
      // Resolve the lock promise to release waiting operations
      const lockPromise = this.sessionLocks.get(sessionId);
      if (lockPromise && (lockPromise as any).resolve) {
        (lockPromise as any).resolve();
        this.sessionLocks.delete(sessionId);
      }
      
      // Process next in queue
      this.processNextInQueue(sessionId);
    }
  }

  addTurn(sessionId: string, role: ConversationTurn['role'], content: string, metadata?: ConversationTurn['metadata']): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }
    if (session.status !== 'active' && session.status !== 'processing') {
      throw new SessionError(`Session ${sessionId} is not active or processing`, 'SESSION_INVALID_STATE', sessionId);
    }

    const turn: ConversationTurn = {
      id: uuidv4(),
      role,
      content,
      timestamp: Date.now(),
      metadata,
    };

    session.turns.push(turn);
    session.lastActivity = Date.now();

    // Check turn limit
    if (session.turns.length >= this.MAX_TURNS) {
      session.status = 'completing';
    }
  }

  updateProgress(sessionId: string, updates: Partial<ConversationState['analysisProgress']>): void {
    const session = this.getSession(sessionId);
    if (!session) {return;}

    session.analysisProgress = {
      ...session.analysisProgress,
      ...updates,
    };

    // Auto-complete if confidence is high enough
    if (session.analysisProgress.confidenceLevel >= 0.9) {
      session.status = 'completing';
    }
  }

  shouldComplete(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) {return true;}

    return (
      session.status === 'completing' ||
      session.analysisProgress.pendingQuestions.length === 0 ||
      session.analysisProgress.confidenceLevel >= 0.9 ||
      session.turns.length >= this.MAX_TURNS
    );
  }

  extractResults(sessionId: string): DeepAnalysisResult {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    // Synthesize all findings from the conversation
    const conversationInsights = this.extractInsightsFromTurns(session.turns);
    const recommendations = this.extractRecommendations(session);

    return {
      status: 'success',
      findings: {
        rootCauses: [],
        executionPaths: [],
        performanceBottlenecks: [],
        crossSystemImpacts: [],
      },
      recommendations: {
        immediateActions: [],
        investigationNextSteps: recommendations,
        codeChangesNeeded: [],
      },
      enrichedContext: {
        newInsights: conversationInsights.map(insight => ({
          type: 'conversational',
          description: insight,
          supporting_evidence: [],
        })),
        validatedHypotheses: [],
        ruledOutApproaches: session.context.attemptedApproaches,
      },
      metadata: {
        sessionId,
        totalTurns: session.turns.length,
        duration: Date.now() - session.startTime,
        completedSteps: session.analysisProgress.completedSteps,
      },
    };
  }

  private extractInsightsFromTurns(turns: ConversationTurn[]): string[] {
    // Extract structured insights from conversation history
    const insights: string[] = [];

    for (const turn of turns) {
      if (turn.metadata?.newFindings) {
        insights.push(...turn.metadata.newFindings.map((f) => {
          if (typeof f === 'string') {
            return f;
          }
          const finding = f as Record<string, unknown>;
          return (typeof finding.description === 'string' ? finding.description : null) || JSON.stringify(f);
        }));
      }
    }

    return insights;
  }

  private generateSummaryFromConversation(session: ConversationState): string {
    // Generate a coherent summary from the entire conversation
    const geminiTurns = session.turns.filter(t => t.role === 'gemini');
    const keyPoints = geminiTurns
      .map(t => this.extractKeyPoint(t.content))
      .filter(Boolean);

    const analysisType = session.turns[0]?.metadata?.analysisType || 'code';

    return `After ${session.turns.length} exchanges analyzing ${analysisType}, ` +
           `discovered: ${keyPoints.join('; ')}`;
  }

  private extractKeyPoint(content: string): string {
    // Simple extraction - in practice, use NLP or structured parsing
    const lines = content.split('\n');
    return lines.find(line => line.includes('found') || line.includes('discovered')) || '';
  }

  private extractRecommendations(session: ConversationState): string[] {
    // Extract actionable recommendations from the conversation
    const recommendations: string[] = [];

    for (const turn of session.turns) {
      if (turn.role === 'gemini' && turn.content.includes('recommend')) {
        // Parse recommendations from Gemini's responses
        const recMatch = turn.content.match(/recommend[s]?:?\s*(.+?)(?:\n|$)/gi);
        if (recMatch) {
          recommendations.push(...recMatch);
        }
      }
    }

    return recommendations;
  }

  private cleanupAbandonedSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT_MS) {
        this.sessions.delete(sessionId);
      }
    }
  }

  getActiveSessionCount(): number {
    return Array.from(this.sessions.values())
      .filter(s => s.status === 'active')
      .length;
  }

  /**
   * Clean up a session after it's been finalized
   */
  cleanupSession(sessionId: string): void {
    // Release any locks first
    this.releaseLock(sessionId);
    
    // Remove from sessions map
    this.sessions.delete(sessionId);
  }
}