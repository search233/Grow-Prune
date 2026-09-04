import { EventBus } from './EventBus';
import { CellType } from '../core/types';

export class SoundEngine {
  private ctx: AudioContext | null = null;

  constructor(eventBus?: EventBus) {
    if (eventBus) {
      this.attachToEventBus(eventBus);
    }
  }

  public init(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public attachToEventBus(eventBus: EventBus): void {
    eventBus.on('snake:eat', ({ type }) => {
      if (type === CellType.FOOD) {
        this.playEatFood();
      } else {
        this.playEatBonus();
      }
    });

    eventBus.on('snake:severed', () => {
      this.playCutTail();
    });

    eventBus.on('piece:lock', () => {
      this.playDropBlock();
    });

    eventBus.on('line:cleared', () => {
      this.playLineClear();
    });

    eventBus.on('game:over', () => {
      this.playGameOver();
    });
  }

  private playTone(freq: number, type: OscillatorType, duration: number, startVol = 0.15, endVol = 0.001): void {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(startVol, now);
      gain.gain.exponentialRampToValueAtTime(endVol, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // 忽略部分浏览器策略限制
    }
  }

  public playEatFood(): void {
    this.init();
    this.playTone(520, 'sine', 0.08, 0.15);
  }

  public playEatBonus(): void {
    this.init();
    if (!this.ctx) return;
    [587, 740, 880].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.12, 0.2), idx * 60);
    });
  }

  public playDropBlock(): void {
    this.init();
    this.playTone(130, 'square', 0.06, 0.1);
  }

  public playCutTail(): void {
    this.init();
    if (!this.ctx) return;
    this.playTone(280, 'sawtooth', 0.15, 0.25);
    setTimeout(() => this.playTone(180, 'sawtooth', 0.2, 0.2), 70);
  }

  public playLineClear(): void {
    this.init();
    if (!this.ctx) return;
    [440, 554, 659, 880].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.25, 0.22), idx * 80);
    });
  }

  public playGameOver(): void {
    this.init();
    if (!this.ctx) return;
    [320, 260, 200, 140].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.25, 0.3), idx * 100);
    });
  }
}
