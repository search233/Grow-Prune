import { BLOCK_SIZE, COLS, ROWS } from '../core/Constants';
import { GameState } from '../core/GameState';
import { CellType, Direction, Point } from '../core/types';
import { CameraShake } from './CameraShake';
import { ParticleSystem } from './ParticleSystem';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cameraShake: CameraShake;
  private particleSystem: ParticleSystem;

  constructor(
    canvas: HTMLCanvasElement,
    cameraShake: CameraShake,
    particleSystem: ParticleSystem
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.cameraShake = cameraShake;
    this.particleSystem = particleSystem;
  }

  public render(gameState: GameState): void {
    const ctx = this.ctx;

    ctx.save();

    // 1. 舞台背景：参考图同款的“海蓝中心扩散放射径向渐变”
    this.drawOceanVignetteBackground(ctx);

    // 屏幕震颤偏移
    this.cameraShake.apply(ctx);

    // 2. 绘制参考图同款的圆角蓝图网格 (Blueprint Rounded Grid)
    this.drawBlueprintGrid(ctx);

    // 3. 绘制静态网格内容 (BLOCK, FOOD, BONUS_FOOD)
    this.drawGridCells(ctx, gameState);

    // 4. 绘制 Ghost Piece 虚影投影 (天蓝蓝图虚框)
    this.drawGhostPiece(ctx, gameState);

    // 5. 绘制受控下落中的俄罗斯方块 (带质感微渐变与装饰线)
    this.drawActivePiece(ctx, gameState);

    // 6. 绘制贪吃蛇
    this.drawSnake(ctx, gameState);

    // 7. 绘制粒子火花
    this.particleSystem.render(ctx);

    ctx.restore();
  }

  /**
   * 绘制参考图标志性的水蓝色中心发散光晕背景
   */
  private drawOceanVignetteBackground(ctx: CanvasRenderingContext2D): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const bgGrad = ctx.createRadialGradient(cx, cy * 0.95, 20, cx, cy * 0.95, Math.max(w, h) * 0.75);
    bgGrad.addColorStop(0, '#3aa1c4');    // 核心亮海水青蓝
    bgGrad.addColorStop(0.35, '#2881a2'); // 柔和深海蓝
    bgGrad.addColorStop(0.72, '#185975'); // 边缘深青蓝
    bgGrad.addColorStop(1, '#0e3447');    // 暗色压角深邃蓝

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * 绘制参考图同款的微倒角单元格线框网格 (Blueprint Rounded Grid)
   */
  private drawBlueprintGrid(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(215, 245, 255, 0.16)';
    ctx.lineWidth = 1;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const px = c * BLOCK_SIZE;
        const py = r * BLOCK_SIZE;

        ctx.beginPath();
        // 绘制微圆角线框
        ctx.roundRect(px + 1.5, py + 1.5, BLOCK_SIZE - 3, BLOCK_SIZE - 3, 3.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /**
   * 绘制静态网格元素
   */
  private drawGridCells(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const grid = gameState.grid;

    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const type = grid.get(c, r);
        const px = c * BLOCK_SIZE;
        const py = r * BLOCK_SIZE;

        if (type === CellType.BLOCK) {
          // 固化方块：深青灰立体微渐变 + 装饰双点
          this.drawStyledBlock(ctx, px, py, '#2c3e50', true);
        } else if (type === CellType.FOOD) {
          // 普通食物：参考图右下角同款金色菱形晶石 (Golden Diamond Gem, 对应 🔸)
          this.drawDiamondGem(ctx, px + BLOCK_SIZE / 2, py + BLOCK_SIZE / 2, BLOCK_SIZE * 0.36, false);
        } else if (type === CellType.BONUS_FOOD) {
          // 高能食物：耀眼电光青蓝多切面高能棱晶钻石 (Cyan Prism Gem, 对应 💎)
          this.drawDiamondGem(ctx, px + BLOCK_SIZE / 2, py + BLOCK_SIZE / 2, BLOCK_SIZE * 0.44, true);
        }
      }
    }
  }

  /**
   * 绘制菱形切面晶体宝石：
   * - 普通金钻 (FOOD): 琥珀暖金配色（对应 🔸）
   * - 高能棱晶 (BONUS_FOOD): 耀眼电光青蓝钻石配色（对应 💎）
   */
  private drawDiamondGem(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    isBonus = false
  ): void {
    ctx.save();

    const pulse = (Math.sin(Date.now() * 0.007) + 1) * 0.5;
    const s = size * (isBonus ? 1.18 + pulse * 0.14 : 1.0 + pulse * 0.06);

    // 外发光光晕：普通金钻为琥珀暖金；高能棱晶为耀眼青蓝钻石光晕
    ctx.shadowColor = isBonus ? 'rgba(56, 189, 248, 0.95)' : 'rgba(245, 158, 11, 0.75)';
    ctx.shadowBlur = isBonus ? 20 : 12;

    // 菱形 4 极点坐标
    const top = { x: cx, y: cy - s };
    const right = { x: cx + s * 0.68, y: cy };
    const bottom = { x: cx, y: cy + s };
    const left = { x: cx - s * 0.68, y: cy };
    const center = { x: cx, y: cy - s * 0.05 };

    // 切面 1: 左上切面 (受光面: 青空亮蓝 vs 暖明黄)
    ctx.fillStyle = isBonus ? '#7dd3fc' : '#fcd34d';
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(center.x, center.y);
    ctx.lineTo(left.x, left.y);
    ctx.closePath();
    ctx.fill();

    // 切面 2: 右上切面 (极亮白色高光切面)
    ctx.fillStyle = isBonus ? '#ffffff' : '#fef9c3';
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(center.x, center.y);
    ctx.closePath();
    ctx.fill();

    // 切面 3: 左下切面 (深阴影面: 蓝宝石深青 vs 深琥珀金)
    ctx.fillStyle = isBonus ? '#0284c7' : '#b45309';
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(center.x, center.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.closePath();
    ctx.fill();

    // 切面 4: 右下切面 (漫射背光面: 电光青蓝 vs 金棕色)
    ctx.fillStyle = isBonus ? '#38bdf8' : '#d97706';
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.closePath();
    ctx.fill();

    // 晶莹微白边线
    ctx.strokeStyle = isBonus ? 'rgba(224, 242, 254, 0.85)' : 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.lineTo(left.x, left.y);
    ctx.closePath();
    ctx.stroke();

    // 内部对角棱线
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 【核心新视觉】：参考图中下方橙色滑块质感的圆角积木 (带有温润渐变与侧边装饰线)
   */
  private drawStyledBlock(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    baseColor: string,
    isStatic = false
  ): void {
    ctx.save();
    const pad = 1.5;
    const x = px + pad;
    const y = py + pad;
    const w = BLOCK_SIZE - pad * 2;
    const h = BLOCK_SIZE - pad * 2;
    const r = 4; // 圆角

    // 渐变填充 (上浅下深，凸显立体温润感)
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    if (isStatic) {
      grad.addColorStop(0, '#2d3b4a');
      grad.addColorStop(1, '#1b2530');
    } else {
      grad.addColorStop(0, baseColor);
      grad.addColorStop(1, this.darkenHex(baseColor, 0.3));
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();

    // 细致的暗色边缘描边
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 绘制 Ghost Piece 虚影投影
   */
  private drawGhostPiece(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const piece = gameState.currentPiece;
    if (!piece) return;

    const ghostY = piece.getGhostDropY(gameState.grid);
    const ghostCells = piece.getOccupiedCells(0, ghostY - piece.y);

    ctx.save();
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.45)'; // 浅天蓝
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);

    for (const cell of ghostCells) {
      if (cell.y >= 0) {
        const px = cell.x * BLOCK_SIZE + 1.5;
        const py = cell.y * BLOCK_SIZE + 1.5;
        const s = BLOCK_SIZE - 3;
        ctx.beginPath();
        ctx.roundRect(px, py, s, s, 3.5);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /**
   * 绘制活动下落方块
   */
  private drawActivePiece(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const piece = gameState.currentPiece;
    if (!piece) return;

    const cells = piece.getOccupiedCells();
    for (const cell of cells) {
      if (cell.y >= 0) {
        const px = cell.x * BLOCK_SIZE;
        const py = cell.y * BLOCK_SIZE;
        this.drawStyledBlock(ctx, px, py, piece.color, false);
      }
    }
  }

  /**
   * 绘制贪吃蛇 (胶囊式节节圆角渐变 + 灵动眼睛)
   */
  private drawSnake(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const snake = gameState.snake;
    const segments = snake.getSegments();
    if (segments.length === 0) return;

    // 1. 蛇身圆角节点
    for (let i = segments.length - 1; i >= 1; i--) {
      const seg = segments[i];
      const px = seg.x * BLOCK_SIZE;
      const py = seg.y * BLOCK_SIZE;

      const ratio = i / Math.max(segments.length, 1);
      const g = Math.floor(190 - ratio * 65);
      const color = `rgb(16, ${g}, 85)`;

      this.drawSnakeSegment(ctx, px, py, color);
    }

    // 2. 蛇头
    const head = segments[0];
    const hx = head.x * BLOCK_SIZE;
    const hy = head.y * BLOCK_SIZE;

    ctx.save();
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 10;
    this.drawSnakeSegment(ctx, hx, hy, '#22c55e');
    ctx.restore();

    // 3. 蛇头朝向眼睛（采用 visualDirection 提供 0 延迟即时视觉反馈）
    this.drawSnakeEyes(ctx, hx, hy, snake.visualDirection);
  }

  private drawSnakeSegment(ctx: CanvasRenderingContext2D, px: number, py: number, color: string): void {
    const pad = 1.5;
    const x = px + pad;
    const y = py + pad;
    const s = BLOCK_SIZE - pad * 2;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, s, s, 5);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawSnakeEyes(
    ctx: CanvasRenderingContext2D,
    hx: number,
    hy: number,
    dir: Direction
  ): void {
    const offset = Math.max(5, Math.round(BLOCK_SIZE * 0.26));
    const eyeRadius = Math.max(2, Math.round(BLOCK_SIZE * 0.11));
    const pupilRadius = Math.max(1, Math.round(BLOCK_SIZE * 0.06));

    let eye1: Point = { x: 0, y: 0 };
    let eye2: Point = { x: 0, y: 0 };

    if (dir.y === -1) { // 向上
      eye1 = { x: hx + offset, y: hy + offset };
      eye2 = { x: hx + BLOCK_SIZE - offset, y: hy + offset };
    } else if (dir.y === 1) { // 向下
      eye1 = { x: hx + offset, y: hy + BLOCK_SIZE - offset };
      eye2 = { x: hx + BLOCK_SIZE - offset, y: hy + BLOCK_SIZE - offset };
    } else if (dir.x === -1) { // 向左
      eye1 = { x: hx + offset, y: hy + offset };
      eye2 = { x: hx + offset, y: hy + BLOCK_SIZE - offset };
    } else { // 向右
      eye1 = { x: hx + BLOCK_SIZE - offset, y: hy + offset };
      eye2 = { x: hx + BLOCK_SIZE - offset, y: hy + BLOCK_SIZE - offset };
    }

    // 眼白
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eye1.x, eye1.y, eyeRadius, 0, Math.PI * 2);
    ctx.arc(eye2.x, eye2.y, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    // 瞳孔
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(eye1.x + dir.x, eye1.y + dir.y, pupilRadius, 0, Math.PI * 2);
    ctx.arc(eye2.x + dir.x, eye2.y + dir.y, pupilRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  private darkenHex(hex: string, amount: number): string {
    let col = hex.replace('#', '');
    if (col.length === 3) {
      col = col.split('').map(c => c + c).join('');
    }
    const num = parseInt(col, 16);
    if (isNaN(num)) return hex;

    let r = (num >> 16) * (1 - amount);
    let g = ((num >> 8) & 0x00FF) * (1 - amount);
    let b = (num & 0x0000FF) * (1 - amount);

    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }
}
