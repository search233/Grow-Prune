import { COLS, ROWS } from './Constants';
import { Direction, Point } from './types';

export class Snake {
  private segments: Point[] = [];
  private currentDir: Direction = { x: 0, y: -1 };
  private directionQueue: Direction[] = [];
  private growthPending = 0;

  constructor(initialSegments: Point[] = [], initialDir: Direction = { x: 0, y: -1 }) {
    this.reset(initialSegments, initialDir);
  }

  public reset(initialSegments: Point[] = [], initialDir: Direction = { x: 0, y: -1 }): void {
    const midX = Math.floor(COLS / 2);
    const startY = Math.floor(ROWS * 0.7);

    this.segments = initialSegments.length > 0
      ? initialSegments.map(p => ({ ...p }))
      : [
          { x: midX, y: startY },
          { x: midX, y: startY + 1 },
          { x: midX, y: startY + 2 }
        ];
    this.currentDir = { ...initialDir };
    this.directionQueue = [];
    this.growthPending = 0;
  }

  public getHead(): Point {
    return { ...this.segments[0] };
  }

  public getSegments(): readonly Point[] {
    return this.segments;
  }

  public getBody(): Point[] {
    return this.segments.slice(1).map(p => ({ ...p }));
  }

  public get length(): number {
    return this.segments.length;
  }

  public get direction(): Direction {
    return { ...this.currentDir };
  }

  /**
   * 视觉朝向：返回玩家最新按下的目标方向，为眼球转动提供 0 延迟即时视觉反馈
   */
  public get visualDirection(): Direction {
    if (this.directionQueue.length > 0) {
      return { ...this.directionQueue[this.directionQueue.length - 1] };
    }
    return { ...this.currentDir };
  }

  /**
   * 下一步物理前进的方向
   */
  public get nextDirection(): Direction {
    if (this.directionQueue.length > 0) {
      return { ...this.directionQueue[0] };
    }
    return { ...this.currentDir };
  }

  public get pendingGrowth(): number {
    return this.growthPending;
  }

  /**
   * 设置蛇的下一个转向目标（采用深度为 2 的转向指令队列）
   * 彻底避免快速“拐角双连击”导致的吞键与误判掉头死锁
   */
  public setDirection(newDir: Direction): boolean {
    // 对比基准：若队列中有待执行转向，则对比队列末尾的目标；否则对比当前运动方向
    const lastTarget = this.directionQueue.length > 0
      ? this.directionQueue[this.directionQueue.length - 1]
      : this.currentDir;

    // 1. 禁止 180° 反向掉头
    const isOpposite =
      (newDir.x !== 0 && newDir.x === -lastTarget.x) ||
      (newDir.y !== 0 && newDir.y === -lastTarget.y);
    if (isOpposite) {
      return false;
    }

    // 2. 禁止重复压入完全相同方向
    const isSame = newDir.x === lastTarget.x && newDir.y === lastTarget.y;
    if (isSame) {
      return false;
    }

    // 3. 最大深度为 2，避免积压过多历史指令产生滞后感
    if (this.directionQueue.length < 2) {
      this.directionQueue.push({ ...newDir });
      return true;
    }

    // 若队列已满，覆盖最后一个排队指令
    this.directionQueue[this.directionQueue.length - 1] = { ...newDir };
    return true;
  }

  /**
   * 预计算下一步头部到达的坐标
   */
  public peekNextHeadPosition(): Point {
    const nextDir = this.nextDirection;
    return {
      x: this.segments[0].x + nextDir.x,
      y: this.segments[0].y + nextDir.y
    };
  }

  /**
   * 执行单步位移
   * @param nextPos 头部移入的新坐标
   * @param growImmediately 是否在当前步立即增长（尾部不出队）
   */
  public advance(nextPos: Point, growImmediately = false): void {
    if (this.directionQueue.length > 0) {
      this.currentDir = this.directionQueue.shift()!;
    }
    this.segments.unshift({ ...nextPos });

    if (growImmediately) {
      // 尾部不出队，长度 +1
    } else if (this.growthPending > 0) {
      this.growthPending--;
      // 尾部不出队，消耗 1 点储备长度
    } else {
      this.segments.pop();
    }
  }

  /**
   * 增加待增长长度点数
   */
  public addGrowth(count: number): void {
    if (count > 0) {
      this.growthPending += count;
    }
  }

  /**
   * 【核心断尾机制】：从指定索引截断蛇身
   * 保留 [0, index - 1]，销毁并返回 [index, 尾部] 的所有节点
   */
  public severFrom(index: number): Point[] {
    if (index <= 0 || index >= this.segments.length) {
      return [];
    }

    const severed = this.segments.slice(index);
    this.segments = this.segments.slice(0, index);
    return severed;
  }

  /**
   * 检查指定坐标是否在蛇身体中（默认排除蛇头）
   */
  public isBodyAt(x: number, y: number, excludeTail = false): boolean {
    const end = excludeTail ? this.segments.length - 1 : this.segments.length;
    for (let i = 1; i < end; i++) {
      if (this.segments[i].x === x && this.segments[i].y === y) {
        return true;
      }
    }
    return false;
  }
}
