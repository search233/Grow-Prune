import { ALL_TETROMINO_TYPES, COLS, TETROMINO_DEFINITIONS } from './Constants';
import { Grid } from './Grid';
import { CellType, Point, TetrominoType } from './types';

/**
 * 7-Bag 随机器（现代俄罗斯方块标准，确保每 7 个方块不重复，杜绝方块饥饿）
 */
export class RandomBag {
  private bag: TetrominoType[] = [];

  public next(): TetrominoType {
    if (this.bag.length === 0) {
      this.refill();
    }
    return this.bag.pop()!;
  }

  public peek(): TetrominoType {
    if (this.bag.length === 0) {
      this.refill();
    }
    return this.bag[this.bag.length - 1];
  }

  private refill(): void {
    const list = [...ALL_TETROMINO_TYPES];
    // Fisher-Yates 洗牌算法
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    this.bag = list;
  }
}

/**
 * 顺时针旋转 N x N 矩阵 90 度
 */
export function rotateMatrix(matrix: number[][]): number[][] {
  const N = matrix.length;
  const result: number[][] = [];
  for (let r = 0; r < N; r++) {
    result[r] = [];
    for (let c = 0; c < N; c++) {
      result[r][c] = matrix[N - 1 - c][r];
    }
  }
  return result;
}

/**
 * 正在下落受控的俄罗斯方块
 */
export class Tetromino {
  public type: TetrominoType;
  public matrix: number[][];
  public color: string;
  public x: number;
  public y: number;

  constructor(type: TetrominoType) {
    this.type = type;
    const def = TETROMINO_DEFINITIONS[type];
    this.matrix = def.matrix.map(row => [...row]);
    this.color = def.color;
    this.x = Math.floor((COLS - this.matrix[0].length) / 2);
    this.y = 0;
  }

  public clone(): Tetromino {
    const cloned = new Tetromino(this.type);
    cloned.matrix = this.matrix.map(row => [...row]);
    cloned.x = this.x;
    cloned.y = this.y;
    return cloned;
  }

  /**
   * 获取当前方块在场地上的所有实心单元格绝对坐标
   */
  public getOccupiedCells(offsetX = 0, offsetY = 0, testMatrix?: number[][]): Point[] {
    const mat = testMatrix || this.matrix;
    const cells: Point[] = [];
    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (mat[r][c]) {
          cells.push({
            x: this.x + c + offsetX,
            y: this.y + r + offsetY
          });
        }
      }
    }
    return cells;
  }

  /**
   * 检测方块在指定位移或旋转下是否合法
   * （仅受左右侧墙、下底边界与已固化的静态 BLOCK 阻挡；不受蛇身阻挡）
   */
  public isValidPosition(grid: Grid, offsetX = 0, offsetY = 0, testMatrix?: number[][]): boolean {
    const cells = this.getOccupiedCells(offsetX, offsetY, testMatrix);
    for (const cell of cells) {
      if (cell.x < 0 || cell.x >= grid.cols) return false;
      if (cell.y >= grid.rows) return false;
      if (cell.y >= 0 && grid.get(cell.x, cell.y) === CellType.BLOCK) {
        return false;
      }
    }
    return true;
  }

  /**
   * 尝试平移
   */
  public move(dx: number, dy: number, grid: Grid): boolean {
    if (this.isValidPosition(grid, dx, dy)) {
      this.x += dx;
      this.y += dy;
      return true;
    }
    return false;
  }

  /**
   * 尝试顺时针旋转（附带简易 SRS 踢墙：原位 -> 向左 1 格 -> 向右 1 格）
   */
  public rotate(grid: Grid): boolean {
    const rotated = rotateMatrix(this.matrix);

    // 1. 原地旋转测试
    if (this.isValidPosition(grid, 0, 0, rotated)) {
      this.matrix = rotated;
      return true;
    }

    // 2. 简易踢墙：尝试向左平移 1 格
    if (this.isValidPosition(grid, -1, 0, rotated)) {
      this.x -= 1;
      this.matrix = rotated;
      return true;
    }

    // 3. 简易踢墙：尝试向右平移 1 格
    if (this.isValidPosition(grid, 1, 0, rotated)) {
      this.x += 1;
      this.matrix = rotated;
      return true;
    }

    return false;
  }

  /**
   * 计算 Ghost Piece 虚影投影的 Y 轴落点
   */
  public getGhostDropY(grid: Grid): number {
    let dropY = 0;
    while (this.isValidPosition(grid, 0, dropY + 1)) {
      dropY++;
    }
    return this.y + dropY;
  }
}
