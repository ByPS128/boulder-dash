import { Difficulty } from "./types";

/**
 * Result of a cave attempt
 */
export type AttemptResult = "victory" | "death" | "quit";

/**
 * Single cave attempt data
 */
export interface CaveAttempt {
  caveNumber: number;
  result: AttemptResult;
  timeSpent: number; // in seconds
  diamondsCollected: number;
  diamondsNeeded: number;
  score: number;
  finalScore: number; // including time bonus (for victory)
  difficulty: Difficulty;
  timestamp: Date;
}

/**
 * Session statistics tracker
 * Tracks all cave attempts during gameplay session
 */
export class SessionStats {
  private attempts: CaveAttempt[] = [];
  private storageKey = "boulder-dash-stats";

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Add a new cave attempt
   */
  addAttempt(attempt: CaveAttempt): void {
    this.attempts.push(attempt);
    this.saveToStorage();
  }

  /**
   * Get all attempts for a specific cave
   */
  getAttemptsForCave(caveNumber: number): CaveAttempt[] {
    return this.attempts.filter((a) => a.caveNumber === caveNumber);
  }

  /**
   * Get best score for a specific cave
   */
  getBestScoreForCave(caveNumber: number): number {
    const attempts = this.getAttemptsForCave(caveNumber);
    if (attempts.length === 0) return 0;
    return Math.max(...attempts.map((a) => a.finalScore));
  }

  /**
   * Check if a cave was ever completed (victory)
   */
  wasCompleted(caveNumber: number): boolean {
    return this.attempts.some(
      (a) => a.caveNumber === caveNumber && a.result === "victory"
    );
  }

  /**
   * Get total play time across all attempts (in seconds)
   */
  getTotalPlayTime(): number {
    return this.attempts.reduce((sum, a) => sum + a.timeSpent, 0);
  }

  /**
   * Get all attempts
   */
  getAllAttempts(): CaveAttempt[] {
    return [...this.attempts];
  }

  /**
   * Clear all statistics
   */
  clear(): void {
    this.attempts = [];
    this.saveToStorage();
  }

  /**
   * Save statistics to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = this.attempts.map((a) => ({
        ...a,
        timestamp: a.timestamp.toISOString(),
      }));
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save stats to localStorage", e);
    }
  }

  /**
   * Load statistics from localStorage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return;

      const parsed = JSON.parse(data);
      this.attempts = parsed.map((a: any) => ({
        ...a,
        timestamp: new Date(a.timestamp),
      }));
    } catch (e) {
      console.warn("Failed to load stats from localStorage", e);
      this.attempts = [];
    }
  }
}

// Global singleton instance
export const sessionStats = new SessionStats();
