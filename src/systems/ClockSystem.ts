import {
  SNAKE_TICK_INTERVAL_MS,
  TETRIS_NORMAL_INTERVAL_MS,
  TETRIS_SOFT_DROP_INTERVAL_MS
} from '../core/Constants';

export interface ClockCallbacks {
  onSnakeTick: () => void;
  onTetrisTick: (deltaMs: number) => void;
  onScoreTick: () => void;
}

export class ClockSystem {
  private lastSnakeTime = 0;
  private lastTetrisTime = 0;
  private lastScoreTime = 0;
  private callbacks: ClockCallbacks;
  private isRunning = false;

  constructor(callbacks: ClockCallbacks) {
    this.callbacks = callbacks;
  }

  public reset(now = performance.now()): void {
    this.lastSnakeTime = now;
    this.lastTetrisTime = now;
    this.lastScoreTime = now;
    this.isRunning = true;
  }

  public pause(): void {
    this.isRunning = false;
  }

  public resume(now = performance.now()): void {
    this.lastSnakeTime = now;
    this.lastTetrisTime = now;
    this.lastScoreTime = now;
    this.isRunning = true;
  }

  public update(now: number, isSoftDropping: boolean): void {
    if (!this.isRunning) return;

    // 1. Snake Tick（定长步长累加，消除步频微漂移）
    if (now - this.lastSnakeTime >= SNAKE_TICK_INTERVAL_MS) {
      this.callbacks.onSnakeTick();
      this.lastSnakeTime += SNAKE_TICK_INTERVAL_MS;
      // 防止切出浏览器后台等异常情况下的螺旋累积
      if (now - this.lastSnakeTime > SNAKE_TICK_INTERVAL_MS * 2) {
        this.lastSnakeTime = now;
      }
    }

    // 2. Tetris Tick (基础 0.6s / 软降 0.05s)
    const tetrisInterval = isSoftDropping ? TETRIS_SOFT_DROP_INTERVAL_MS : TETRIS_NORMAL_INTERVAL_MS;
    const elapsedTetris = now - this.lastTetrisTime;
    if (elapsedTetris >= tetrisInterval) {
      this.callbacks.onTetrisTick(elapsedTetris);
      this.lastTetrisTime = now;
    }

    // 3. Score Tick (1.0s)
    if (now - this.lastScoreTime >= 1000) {
      this.callbacks.onScoreTick();
      this.lastScoreTime = now;
    }
  }
}
