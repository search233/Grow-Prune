import { BLOCK_SIZE, COLS } from '../core/Constants';
import { CellType } from '../core/types';
import { EventBus } from '../systems/EventBus';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  radius: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];

  constructor(eventBus?: EventBus) {
    if (eventBus) {
      this.attachToEventBus(eventBus);
    }
  }

  public attachToEventBus(eventBus: EventBus): void {
    eventBus.on('snake:eat', ({ type, pos }) => {
      const color = type === CellType.FOOD ? '#facc15' : '#38bdf8';
      const count = type === CellType.FOOD ? 10 : 20;
      this.spawnExplosion(pos.x, pos.y, color, count);
    });

    eventBus.on('snake:severed', ({ severedSegments }) => {
      severedSegments.forEach(seg => {
        this.spawnExplosion(seg.x, seg.y, '#4ade80', 8);
      });
    });

    eventBus.on('line:cleared', ({ rows }) => {
      rows.forEach(r => {
        for (let c = 0; c < COLS; c++) {
          this.spawnExplosion(c, r, '#38bdf8', 5);
        }
      });
    });

    eventBus.on('piece:hard_drop', ({ cells }) => {
      cells.forEach(c => {
        this.spawnDust(c.x, c.y, 3);
      });
    });
  }

  public spawnExplosion(gridX: number, gridY: number, color: string, count = 12): void {
    const centerX = (gridX + 0.5) * BLOCK_SIZE;
    const centerY = (gridY + 0.5) * BLOCK_SIZE;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02,
        radius: Math.random() * 3 + 2
      });
    }
  }

  public spawnDust(gridX: number, gridY: number, count = 4): void {
    const bottomX = (gridX + 0.5) * BLOCK_SIZE;
    const bottomY = (gridY + 1) * BLOCK_SIZE;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: bottomX + (Math.random() * 16 - 8),
        y: bottomY - 2,
        vx: (Math.random() * 2 - 1) * 1.5,
        vy: -Math.random() * 1.5 - 0.5,
        color: '#94a3b8',
        alpha: 0.8,
        decay: 0.05,
        radius: Math.random() * 2 + 1
      });
    }
  }

  public update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public clear(): void {
    this.particles = [];
  }
}
