export class StorageService {
  private static HIGH_SCORE_KEY = 'tetrisnake_highscore';

  public static getHighScore(): number {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.HIGH_SCORE_KEY);
        return stored ? parseInt(stored, 10) || 0 : 0;
      }
    } catch {
      // ignore storage errors (e.g. Incognito mode or disabled cookies)
    }
    return 0;
  }

  public static saveHighScore(score: number): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.HIGH_SCORE_KEY, score.toString());
      }
    } catch {
      // ignore storage errors
    }
  }
}
