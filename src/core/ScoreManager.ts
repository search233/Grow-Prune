import { GameStats } from './types';
import { EventBus } from '../systems/EventBus';
import { StorageService } from './StorageService';

export class ScoreManager {
  public stats: GameStats;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.stats = {
      score: 0,
      snakeLength: 3,
      linesCleared: 0,
      survivalSeconds: 0,
      highScore: StorageService.getHighScore()
    };
  }

  public prepare(initialSnakeLength: number): void {
    this.stats.score = 0;
    this.stats.snakeLength = initialSnakeLength;
    this.stats.linesCleared = 0;
    this.stats.survivalSeconds = 0;
  }

  public addScore(points: number): void {
    if (points <= 0) return;
    this.stats.score += points;
    if (this.stats.score > this.stats.highScore) {
      this.stats.highScore = this.stats.score;
      StorageService.saveHighScore(this.stats.highScore);
    }
    this.eventBus.emit('score:update', { score: this.stats.score });
  }
}
