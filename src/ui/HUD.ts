import { TETROMINO_DEFINITIONS } from '../core/Constants';
import { GameStats, TetrominoType } from '../core/types';
import { EventBus } from '../systems/EventBus';

export class HUD {
  private elScore: HTMLElement;
  private elLength: HTMLElement;
  private elTime: HTMLElement;
  private elLines: HTMLElement;
  private elBest: HTMLElement;

  private nextCanvas: HTMLCanvasElement;
  private nextCtx: CanvasRenderingContext2D;

  constructor(
    elements: {
      score: HTMLElement;
      length: HTMLElement;
      time: HTMLElement;
      lines: HTMLElement;
      best: HTMLElement;
      nextCanvas: HTMLCanvasElement;
    },
    eventBus?: EventBus
  ) {
    this.elScore = elements.score;
    this.elLength = elements.length;
    this.elTime = elements.time;
    this.elLines = elements.lines;
    this.elBest = elements.best;

    this.nextCanvas = elements.nextCanvas;
    this.nextCtx = elements.nextCanvas.getContext('2d')!;

    if (eventBus) {
      this.attachToEventBus(eventBus);
    }
  }

  public attachToEventBus(eventBus: EventBus): void {
    eventBus.on('score:update', ({ score }) => {
      this.elScore.textContent = this.formatScore(score);
    });

    eventBus.on('time:update', ({ seconds }) => {
      this.elTime.textContent = this.formatTime(seconds);
    });
  }

  public updateStats(stats: GameStats, nextType: TetrominoType): void {
    this.elScore.textContent = this.formatScore(stats.score);
    this.elLength.textContent = stats.snakeLength.toString().padStart(2, '0');
    this.elLines.textContent = stats.linesCleared.toString().padStart(2, '0');
    this.elTime.textContent = this.formatTime(stats.survivalSeconds);
    this.elBest.textContent = this.formatScore(stats.highScore);

    this.drawNextPiece(nextType);
  }

  public formatScore(score: number): string {
    return String(score).padStart(10, '0');
  }

  public drawNextPiece(type: TetrominoType): void {
    const ctx = this.nextCtx;
    const w = this.nextCanvas.width;
    const h = this.nextCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // 1. 副屏深海青微光径向渐变底色
    const bg = ctx.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w * 0.7);
    bg.addColorStop(0, '#1c4257');
    bg.addColorStop(0.55, '#102a39');
    bg.addColorStop(1, '#091a24');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // 2. 严格根据有效实体方块计算最小包围盒 (True Bounding Box Centering)
    const def = TETROMINO_DEFINITIONS[type];
    const mat = def.matrix;
    let minC = mat[0].length;
    let maxC = -1;
    let minR = mat.length;
    let maxR = -1;

    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (mat[r][c]) {
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
        }
      }
    }

    const blockCols = maxC - minC + 1;
    const blockRows = maxR - minR + 1;
    const size = 14;

    const totalW = blockCols * size;
    const totalH = blockRows * size;
    const startX = Math.round((w - totalW) / 2) - minC * size;
    const startY = Math.round((h - totalH) / 2) - minR * size;

    // 3. 渲染紧凑连贯、立体质感的俄罗斯方块（与主舞台积木风格一致）
    ctx.save();
    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (mat[r][c]) {
          const px = startX + c * size;
          const py = startY + r * size;
          const pad = 0.5;
          const bx = px + pad;
          const by = py + pad;
          const bs = size - pad * 2;

          // 上浅下深温润微渐变
          const grad = ctx.createLinearGradient(bx, by, bx, by + bs);
          grad.addColorStop(0, def.color);
          grad.addColorStop(1, this.darkenHex(def.color, 0.35));

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(bx, by, bs, bs, 3);
          ctx.fill();

          // 柔和暗边描边
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  private darkenHex(hex: string, factor: number): string {
    const clean = hex.replace('#', '');
    const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
    const r = Math.max(0, Math.floor(((num >> 16) & 0xff) * (1 - factor)));
    const g = Math.max(0, Math.floor(((num >> 8) & 0xff) * (1 - factor)));
    const b = Math.max(0, Math.floor((num & 0xff) * (1 - factor)));
    return `rgb(${r}, ${g}, ${b})`;
  }

  public formatTime(totalSec: number): string {
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}
