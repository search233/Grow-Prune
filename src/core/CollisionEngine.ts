import { Grid } from './Grid';
import { Snake } from './Snake';
import { Tetromino } from './Tetromino';
import { CellType, Point } from './types';

export interface SnakeMoveCheckResult {
  canMove: boolean;
  deathReason?: string;
  target: Point;
  eatType?: CellType.FOOD | CellType.BONUS_FOOD;
}

export interface SmashCheckResult {
  hitHead: boolean;
  hitBody: boolean;
  minHitIndex?: number;
  severedSegments: Point[];
}

export interface SymbioticClearResult {
  clearedRows: number[];
  severedSegments: Point[];
  bonusFoodPoints: Point[];
  snakeCrushedByFallingBlock: boolean;
}

export class CollisionEngine {
  /**
   * 【结算 A】：贪吃蛇移动前瞻与死亡检测
   */
  public static checkSnakeMove(
    snake: Snake,
    grid: Grid,
    activePiece: Tetromino | null
  ): SnakeMoveCheckResult {
    const target = snake.peekNextHeadPosition();

    // 1. 越界检测
    if (!grid.isInside(target.x, target.y)) {
      return { canMove: false, deathReason: '蛇头撞击边界墙体！', target };
    }

    // 2. 撞击静态方块
    if (grid.get(target.x, target.y) === CellType.BLOCK) {
      return { canMove: false, deathReason: '蛇头撞上坚固方块！', target };
    }

    // 3. 自咬检测（如果本步不增长，蛇尾移出腾空，允许进入原蛇尾格）
    const cellAtTarget = grid.get(target.x, target.y);
    const willGrow = (cellAtTarget === CellType.FOOD || cellAtTarget === CellType.BONUS_FOOD || snake.pendingGrowth > 0);
    if (snake.isBodyAt(target.x, target.y, !willGrow)) {
      return { canMove: false, deathReason: '蛇咬到了自身身体！', target };
    }

    // 4. 撞击正在下落中的活动方块
    if (activePiece) {
      const pieceCells = activePiece.getOccupiedCells();
      const hitsPiece = pieceCells.some(c => c.x === target.x && c.y === target.y);
      if (hitsPiece) {
        return { canMove: false, deathReason: '蛇头撞上正在下落的俄罗斯方块！', target };
      }
    }

    // 5. 食物判定
    let eatType: CellType.FOOD | CellType.BONUS_FOOD | undefined;
    if (cellAtTarget === CellType.FOOD || cellAtTarget === CellType.BONUS_FOOD) {
      eatType = cellAtTarget;
    }

    return { canMove: true, target, eatType };
  }

  /**
   * 【结算 B】：方块移动或下落轨迹砸击蛇身判定（砸头致命，砸身断尾）
   */
  public static resolveSmashSnake(cells: Point[], snake: Snake): SmashCheckResult {
    const head = snake.getHead();
    const segments = snake.getSegments();

    // 1. 命中蛇头检测
    for (const c of cells) {
      if (c.x === head.x && c.y === head.y) {
        return { hitHead: true, hitBody: false, severedSegments: [] };
      }
    }

    // 2. 命中蛇身断尾检测：找出所有受创节点的最小索引
    let minBodyHitIdx = Infinity;
    for (const c of cells) {
      for (let i = 1; i < segments.length; i++) {
        if (c.x === segments[i].x && c.y === segments[i].y) {
          if (i < minBodyHitIdx) {
            minBodyHitIdx = i;
          }
        }
      }
    }

    if (minBodyHitIdx !== Infinity) {
      // 执行断尾
      const severed = snake.severFrom(minBodyHitIdx);
      return {
        hitHead: false,
        hitBody: true,
        minHitIndex: minBodyHitIdx,
        severedSegments: severed
      };
    }

    return { hitHead: false, hitBody: false, severedSegments: [] };
  }

  /**
   * 【结算 C】：共生消除检查（Symbiotic Line Clear）
   * 条件：全行每个格子不是 BLOCK 就是 SNAKE_BODY（蛇头不计入以保护蛇头安全）
   */
  public static checkSymbioticLineClear(grid: Grid, snake: Snake): SymbioticClearResult {
    const clearedRows: number[] = [];
    const snakeBody = snake.getBody();

    for (let r = 0; r < grid.rows; r++) {
      let isLineFull = true;

      for (let c = 0; c < grid.cols; c++) {
        const isBlock = (grid.get(c, r) === CellType.BLOCK);
        const isSnakeBody = snakeBody.some(s => s.x === c && s.y === r);

        if (!isBlock && !isSnakeBody) {
          isLineFull = false;
          break;
        }
      }

      if (isLineFull) {
        clearedRows.push(r);
      }
    }

    if (clearedRows.length === 0) {
      return {
        clearedRows: [],
        severedSegments: [],
        bonusFoodPoints: [],
        snakeCrushedByFallingBlock: false
      };
    }

    // 1. 断尾切除：切除穿过被消行的蛇身节点（保留靠近蛇头一端）
    const segments = snake.getSegments();
    let earliestSeverIdx = Infinity;
    for (const rowIdx of clearedRows) {
      for (let i = 1; i < segments.length; i++) {
        if (segments[i].y === rowIdx) {
          if (i < earliestSeverIdx) {
            earliestSeverIdx = i;
          }
        }
      }
    }

    let severedSegments: Point[] = [];
    if (earliestSeverIdx !== Infinity) {
      severedSegments = snake.severFrom(earliestSeverIdx);
    }

    // 2. 消除这些行并平移下落上方所有方块
    grid.removeRowsAndDrop(clearedRows);

    // 3. 检测消行后下坠方块是否压住存活蛇身（不仅仅是蛇头）
    //    从离头最近的 body 节点开始扫描，若有重叠则二次断尾
    const survivingSegments = snake.getSegments();
    let fallCrushSeverIdx = Infinity;
    let snakeCrushedByFallingBlock = false;

    for (let i = 0; i < survivingSegments.length; i++) {
      const seg = survivingSegments[i];
      if (grid.get(seg.x, seg.y) === CellType.BLOCK) {
        if (i === 0) {
          // 蛇头被压 → 致命
          snakeCrushedByFallingBlock = true;
        } else if (i < fallCrushSeverIdx) {
          fallCrushSeverIdx = i;
        }
      }
    }

    // 若蛇身被下落方块压住，执行二次断尾
    let fallCrushSevered: Point[] = [];
    if (!snakeCrushedByFallingBlock && fallCrushSeverIdx !== Infinity) {
      fallCrushSevered = snake.severFrom(fallCrushSeverIdx);
      severedSegments = severedSegments.concat(fallCrushSevered);
    }

    // 4. 产生高能食物 BONUS_FOOD（优先在断点附近放置）
    const bonusFoodPoints: Point[] = [];
    // 收集所有被切断节点作为优先放置参考点
    const severRefPoints = severedSegments.length > 0 ? severedSegments : [];
    for (let i = 0; i < clearedRows.length; i++) {
      let pt: Point | null = null;
      // 优先尝试在断点附近放置
      if (severRefPoints.length > 0) {
        const ref = severRefPoints[Math.min(i, severRefPoints.length - 1)];
        pt = this.spawnFoodNear(grid, CellType.BONUS_FOOD, ref, snake);
      }
      // 兜底：全图随机
      if (!pt) {
        pt = grid.spawnFood(CellType.BONUS_FOOD, [...snake.getSegments()]);
      }
      if (pt) bonusFoodPoints.push(pt);
    }

    // 5. 确保场地上仍有普通食物
    if (!grid.hasCellType(CellType.FOOD)) {
      grid.spawnFood(CellType.FOOD, [...snake.getSegments()]);
    }

    return {
      clearedRows,
      severedSegments,
      bonusFoodPoints,
      snakeCrushedByFallingBlock
    };
  }

  /**
   * 优先在 refPoint 周围 (曼哈顿距离由近到远) 的空格放置食物，
   * 找不到合适位置时返回 null（由调用方兜底全图随机）
   */
  private static spawnFoodNear(
    grid: Grid,
    foodType: CellType,
    refPoint: Point,
    snake: Snake
  ): Point | null {
    const snakeSet = new Set(snake.getSegments().map(s => `${s.x},${s.y}`));

    // 按曼哈顿距离 1→3 搜索空位
    for (let dist = 1; dist <= 3; dist++) {
      const candidates: Point[] = [];
      for (let dx = -dist; dx <= dist; dx++) {
        for (let dy = -dist; dy <= dist; dy++) {
          if (Math.abs(dx) + Math.abs(dy) !== dist) continue;
          const nx = refPoint.x + dx;
          const ny = refPoint.y + dy;
          if (
            grid.isInside(nx, ny) &&
            grid.get(nx, ny) === CellType.EMPTY &&
            !snakeSet.has(`${nx},${ny}`)
          ) {
            candidates.push({ x: nx, y: ny });
          }
        }
      }
      if (candidates.length > 0) {
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        grid.set(chosen.x, chosen.y, foodType);
        return chosen;
      }
    }

    return null;
  }
}
