import {
  SCORE_EAT_BONUS_FOOD,
  SCORE_EAT_FOOD,
  SCORE_HARD_DROP_PER_CELL,
  SCORE_LINE_CLEAR_TABLE,
  SCORE_PER_SECOND_MULTIPLIER,
  SCORE_SEVERED_SEGMENT_BONUS,
  SCORE_SOFT_DROP_PER_CELL,
  SCORE_SYMBIOTIC_SEGMENT_BONUS,
  TETRIS_LOCK_DELAY_MS
} from './Constants';
import { CollisionEngine } from './CollisionEngine';
import { Grid } from './Grid';
import { Snake } from './Snake';
import { RandomBag, Tetromino } from './Tetromino';
import { CellType, GameStats, GameStatus, TetrominoType } from './types';
import { EventBus } from '../systems/EventBus';
import { ScoreManager } from './ScoreManager';

export class GameState {
  public grid: Grid;
  public snake: Snake;
  public currentPiece: Tetromino | null = null;
  public nextPieceType: TetrominoType;
  public randomBag: RandomBag;
  public status: GameStatus = GameStatus.READY;
  public eventBus: EventBus;

  private scoreManager: ScoreManager;
  public get stats(): GameStats {
    return this.scoreManager.stats;
  }

  public isSoftDropping = false;
  private lockDelayTimer = 0;
  private isTouchingGround = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.grid = new Grid();
    this.snake = new Snake();
    this.randomBag = new RandomBag();
    this.nextPieceType = this.randomBag.next();
    this.scoreManager = new ScoreManager(eventBus);
  }

  public prepare(): void {
    this.grid.reset();
    this.snake.reset();
    this.randomBag = new RandomBag();
    this.nextPieceType = this.randomBag.next();
    this.currentPiece = null;
    this.status = GameStatus.READY;
    this.isSoftDropping = false;
    this.lockDelayTimer = 0;
    this.isTouchingGround = false;

    this.scoreManager.prepare(this.snake.length);

    // 刷出第一个方块
    this.spawnNextPiece();

    // 初始刷出普通食物（避让蛇身与初始方块下落投影）
    this.spawnNormalFoodWithAvoidance();

    this.eventBus.emit('score:update', { score: this.stats.score });
  }

  public start(): void {
    if (this.status === GameStatus.READY || this.status === GameStatus.PAUSED) {
      this.status = GameStatus.RUNNING;
      this.eventBus.emit('game:start', undefined as void);
    }
  }

  public reset(): void {
    this.prepare();
    this.status = GameStatus.RUNNING;
    this.eventBus.emit('game:restart', undefined as void);
  }

  /**
   * 蛇时钟 Tick
   */
  public tickSnake(): void {
    if (this.status !== GameStatus.RUNNING) return;

    const check = CollisionEngine.checkSnakeMove(this.snake, this.grid, this.currentPiece);
    if (!check.canMove) {
      this.triggerGameOver(check.deathReason || '贪吃蛇死亡！');
      return;
    }

    // 处理进食
    if (check.eatType === CellType.FOOD) {
      this.snake.addGrowth(1);
      this.grid.set(check.target.x, check.target.y, CellType.EMPTY);
      this.scoreManager.addScore(SCORE_EAT_FOOD);
      this.eventBus.emit('snake:eat', {
        type: CellType.FOOD,
        pos: check.target,
        growth: 1,
        points: SCORE_EAT_FOOD
      });

      // 重新生成普通食物（避让蛇身、当前方块及其下落落点）
      this.spawnNormalFoodWithAvoidance();
    } else if (check.eatType === CellType.BONUS_FOOD) {
      this.snake.addGrowth(3);
      this.grid.set(check.target.x, check.target.y, CellType.EMPTY);
      this.scoreManager.addScore(SCORE_EAT_BONUS_FOOD);
      this.eventBus.emit('snake:eat', {
        type: CellType.BONUS_FOOD,
        pos: check.target,
        growth: 3,
        points: SCORE_EAT_BONUS_FOOD
      });
    }

    // 推进蛇
    this.snake.advance(check.target);
    this.stats.snakeLength = this.snake.length;
    this.eventBus.emit('snake:move', { head: this.snake.getHead() });

    // 蛇移入缺口后也可能填满整行，触发共生消行
    this.processSymbioticLineClear();
  }

  /**
   * 俄罗斯方块时钟 Tick（结合触底锁定延迟 Lock Delay）
   */
  public tickTetris(deltaMs: number): void {
    if (this.status !== GameStatus.RUNNING || !this.currentPiece) return;

    const canMoveDown = this.currentPiece.isValidPosition(this.grid, 0, 1);

    if (canMoveDown) {
      this.currentPiece.y += 1;
      this.isTouchingGround = false;
      this.lockDelayTimer = 0;

      // 软降得分奖励
      if (this.isSoftDropping) {
        this.scoreManager.addScore(SCORE_SOFT_DROP_PER_CELL);
      }

      // 检查下落这格是否砸中蛇
      this.resolvePieceSmash(this.currentPiece.getOccupiedCells());
      this.eventBus.emit('piece:move', { piece: this.currentPiece });
    } else {
      // 触底：触发锁定延迟倒计时
      this.isTouchingGround = true;
      this.lockDelayTimer += deltaMs;

      // 软降或锁定时间已到，立即固化
      if (this.isSoftDropping || this.lockDelayTimer >= TETRIS_LOCK_DELAY_MS) {
        this.lockCurrentPiece();
      }
    }
  }

  /**
   * 平移方块（P2）
   */
  public moveTetris(dx: number): boolean {
    if (this.status !== GameStatus.RUNNING || !this.currentPiece) return false;

    if (this.currentPiece.move(dx, 0, this.grid)) {
      // 若处于触底状态，滑动可重置锁定延迟
      if (this.isTouchingGround) {
        this.lockDelayTimer = 0;
      }

      this.resolvePieceSmash(this.currentPiece.getOccupiedCells());
      this.eventBus.emit('piece:move', { piece: this.currentPiece });
      this.eventBus.emit('piece:shift', { dx });
      return true;
    }
    return false;
  }

  /**
   * 旋转方块（P2）
   */
  public rotateTetris(): boolean {
    if (this.status !== GameStatus.RUNNING || !this.currentPiece) return false;

    if (this.currentPiece.rotate(this.grid)) {
      if (this.isTouchingGround) {
        this.lockDelayTimer = 0;
      }

      this.resolvePieceSmash(this.currentPiece.getOccupiedCells());
      this.eventBus.emit('piece:rotate', { piece: this.currentPiece });
      return true;
    }
    return false;
  }

  /**
   * 瞬间硬降（P2）
   */
  public hardDropTetris(): void {
    if (this.status !== GameStatus.RUNNING || !this.currentPiece) return;

    const landingY = this.currentPiece.getGhostDropY(this.grid);
    const trajectoryCells: { x: number; y: number }[] = [];

    for (let y = this.currentPiece.y; y <= landingY; y++) {
      const testPiece = this.currentPiece.clone();
      testPiece.y = y;
      testPiece.getOccupiedCells().forEach(c => trajectoryCells.push(c));
    }

    // 结算穿透砸击
    this.resolvePieceSmash(trajectoryCells);
    if (this.status !== GameStatus.RUNNING) return;

    const dropDistance = Math.max(0, landingY - this.currentPiece.y);
    const dropPoints = dropDistance * SCORE_HARD_DROP_PER_CELL;
    if (dropPoints > 0) {
      this.scoreManager.addScore(dropPoints);
    }

    this.currentPiece.y = landingY;
    const finalCells = this.currentPiece.getOccupiedCells();
    this.eventBus.emit('piece:hard_drop', {
      landingY,
      cells: finalCells,
      dropDistance,
      points: dropPoints
    });

    this.lockCurrentPiece();
  }

  /**
   * 固化方块
   */
  private lockCurrentPiece(): void {
    if (!this.currentPiece) return;

    const cells = this.currentPiece.getOccupiedCells();

    // 1. 封顶检测：超出网格顶部上方
    for (const c of cells) {
      if (c.y < 0) {
        this.triggerGameOver('方块超出顶部，堆叠封顶！');
        return;
      }
    }

    // 2. 检查是否有食物被落下的方块压住（补救置顶/重置机制）
    const displacedFoods: { type: CellType; x: number; originalY: number }[] = [];
    for (const c of cells) {
      if (this.grid.isInside(c.x, c.y)) {
        const existing = this.grid.get(c.x, c.y);
        if (existing === CellType.FOOD || existing === CellType.BONUS_FOOD) {
          displacedFoods.push({ type: existing, x: c.x, originalY: c.y });
        }
      }
    }

    // 3. 写入 Grid
    for (const c of cells) {
      if (this.grid.isInside(c.x, c.y)) {
        this.grid.set(c.x, c.y, CellType.BLOCK);
      }
    }

    // 4. 执行被压食物补救（优先智能置顶浮起到刚落成方块表面）
    for (const food of displacedFoods) {
      const topY = this.grid.findTopAvailableInColumn(food.x, food.originalY);
      if (topY !== null && topY >= 0) {
        // 浮起到新方块顶表面空位
        this.grid.set(food.x, topY, food.type);
      } else {
        // 上方无空位或封顶，安全重置刷新到任意空位
        this.grid.spawnFood(food.type, [...this.snake.getSegments()]);
      }
    }

    this.eventBus.emit('piece:lock', { piece: this.currentPiece, cells });

    // 5. 执行共生消行检测（与 tickSnake 共用）
    this.processSymbioticLineClear();

    if ((this.status as GameStatus) === GameStatus.GAME_OVER) return;

    // 6. 生成下一方块 (先生成才能获取到它的下落投影，避免食物刷在方块落点)
    this.spawnNextPiece();

    if ((this.status as GameStatus) === GameStatus.GAME_OVER) return;

    // 7. 全局食物存量保底机制：确保场上永远至少有一颗普通食物，彻底杜绝死锁
    this.ensureFoodSupply();
  }

  /**
   * 共生消行统一处理入口（tickSnake 与 lockCurrentPiece 共用）
   */
  private processSymbioticLineClear(): void {
    const clearResult = CollisionEngine.checkSymbioticLineClear(this.grid, this.snake);
    if (clearResult.clearedRows.length === 0) return;

    const count = clearResult.clearedRows.length;
    this.stats.linesCleared += count;

    // 1. 基础阶梯消行分 (1行 200, 2行 500, 3行 1000, 4行 2000，超过4行按每行500)
    const basePoints = count < SCORE_LINE_CLEAR_TABLE.length
      ? SCORE_LINE_CLEAR_TABLE[count]
      : count * 500;

    // 2. 共生肉身筑桥加成（被消除行中包含的蛇身节点数 * 50）
    const symbioticBonus = (clearResult.symbioticSegmentsCount || 0) * SCORE_SYMBIOTIC_SEGMENT_BONUS;

    // 3. 断尾修剪补偿分（切除的蛇身节点数 * 20）
    const pruneBonus = clearResult.severedSegments.length * SCORE_SEVERED_SEGMENT_BONUS;

    const totalLinePoints = basePoints + symbioticBonus + pruneBonus;
    this.scoreManager.addScore(totalLinePoints);

    this.eventBus.emit('line:cleared', {
      rows: clearResult.clearedRows,
      count: clearResult.clearedRows.length,
      bonusFoods: clearResult.bonusFoodPoints,
      points: totalLinePoints,
      basePoints,
      symbioticBonus,
      pruneBonus
    });

    if (clearResult.severedSegments.length > 0) {
      this.stats.snakeLength = this.snake.length;
      this.eventBus.emit('snake:severed', {
        index: this.snake.length,
        severedSegments: clearResult.severedSegments,
        points: pruneBonus
      });
    }

    if (clearResult.snakeCrushedByFallingBlock) {
      this.triggerGameOver('上方方块下落砸碎了蛇头！');
      return;
    }

    // 消行后确保普通食物存量
    this.ensureFoodSupply();
  }

  /**
   * 避让式生成普通食物（避开蛇身、当前下落方块及其下落落点投影）
   */
  public spawnNormalFoodWithAvoidance(): void {
    const exclude = [...this.snake.getSegments()];
    if (this.currentPiece) {
      this.currentPiece.getOccupiedCells().forEach(c => exclude.push(c));
      const ghostY = this.currentPiece.getGhostDropY(this.grid);
      const ghostCells = this.currentPiece.getOccupiedCells(0, ghostY - this.currentPiece.y);
      ghostCells.forEach(c => exclude.push(c));
    }
    this.grid.spawnFood(CellType.FOOD, exclude);
  }

  /**
   * 确保场上必定存在普通食物
   */
  public ensureFoodSupply(): void {
    if (!this.grid.hasCellType(CellType.FOOD)) {
      this.spawnNormalFoodWithAvoidance();
    }
  }

  /**
   * 刷出下一个方块
   */
  private spawnNextPiece(): void {
    const nextType = this.nextPieceType;
    this.currentPiece = new Tetromino(nextType);
    this.nextPieceType = this.randomBag.next();
    this.isTouchingGround = false;
    this.lockDelayTimer = 0;

    // 检查初始生成点是否已被 BLOCK 阻挡（封顶）
    if (!this.currentPiece.isValidPosition(this.grid)) {
      this.triggerGameOver('场地积木过高，新方块无法生成（封顶）！');
      return;
    }

    // 检查刚生成位置是否直接砸在蛇身上
    this.resolvePieceSmash(this.currentPiece.getOccupiedCells());
  }

  /**
   * 检测方块单元格与蛇身碰撞
   */
  private resolvePieceSmash(cells: { x: number; y: number }[]): void {
    const smash = CollisionEngine.resolveSmashSnake(cells, this.snake);
    if (smash.hitHead) {
      this.triggerGameOver('蛇头被下落的俄罗斯方块砸碎！');
      return;
    }

    if (smash.hitBody && smash.severedSegments.length > 0) {
      this.stats.snakeLength = this.snake.length;
      const pruneBonus = smash.severedSegments.length * SCORE_SEVERED_SEGMENT_BONUS;
      if (pruneBonus > 0) {
        this.scoreManager.addScore(pruneBonus);
      }
      this.eventBus.emit('snake:severed', {
        index: smash.minHitIndex!,
        severedSegments: smash.severedSegments,
        points: pruneBonus
      });
    }
  }

  /**
   * 存活计分时钟 Tick
   */
  public tickScore(): void {
    if (this.status !== GameStatus.RUNNING) return;

    this.stats.survivalSeconds++;
    this.scoreManager.addScore(this.snake.length * SCORE_PER_SECOND_MULTIPLIER);
    this.eventBus.emit('time:update', { seconds: this.stats.survivalSeconds });
  }

  public triggerGameOver(reason: string): void {
    if (this.status === GameStatus.GAME_OVER) return;

    this.status = GameStatus.GAME_OVER;
    this.eventBus.emit('game:over', { reason });
  }
}
