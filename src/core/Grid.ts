import { COLS, ROWS } from './Constants';
import { CellType, Point } from './types';

export class Grid {
  public readonly cols: number;
  public readonly rows: number;
  private data: CellType[][];

  constructor(cols = COLS, rows = ROWS) {
    this.cols = cols;
    this.rows = rows;
    this.data = this.createEmptyMatrix();
  }

  private createEmptyMatrix(): CellType[][] {
    const matrix: CellType[][] = [];
    for (let r = 0; r < this.rows; r++) {
      matrix.push(new Array(this.cols).fill(CellType.EMPTY));
    }
    return matrix;
  }

  public reset(): void {
    this.data = this.createEmptyMatrix();
  }

  public isInside(x: number, y: number): boolean {
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
  }

  public get(x: number, y: number): CellType {
    if (!this.isInside(x, y)) {
      return CellType.EMPTY;
    }
    return this.data[y][x];
  }

  public set(x: number, y: number, type: CellType): void {
    if (this.isInside(x, y)) {
      this.data[y][x] = type;
    }
  }

  /**
   * 查找场地中所有的纯空格（排除指定外部实体占用的坐标集合）
   */
  public getEmptyCells(excludeCoords: Point[] = []): Point[] {
    const excludeSet = new Set(excludeCoords.map(p => `${p.x},${p.y}`));
    const emptyCells: Point[] = [];

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.data[y][x] === CellType.EMPTY && !excludeSet.has(`${x},${y}`)) {
          emptyCells.push({ x, y });
        }
      }
    }
    return emptyCells;
  }

  /**
   * 随机在空位投放食物
   */
  public spawnFood(foodType: CellType, excludeCoords: Point[] = []): Point | null {
    const emptyCells = this.getEmptyCells(excludeCoords);
    if (emptyCells.length === 0) return null;

    const choice = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    this.set(choice.x, choice.y, foodType);
    return choice;
  }

  /**
   * 检查场地上是否存在指定类型的食物
   */
  public hasCellType(type: CellType): boolean {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.data[y][x] === type) return true;
      }
    }
    return false;
  }

  /**
   * 统计场地上指定类型的单元格数量
   */
  public countCellType(type: CellType): number {
    let count = 0;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.data[y][x] === type) count++;
      }
    }
    return count;
  }

  /**
   * 在指定列中从 startY 向上寻找第一个可用的纯空单元格（用于食物被压时的智能浮起置顶）
   */
  public findTopAvailableInColumn(x: number, startY: number): number | null {
    if (x < 0 || x >= this.cols) return null;
    for (let y = startY - 1; y >= 0; y--) {
      if (this.data[y][x] === CellType.EMPTY) {
        return y;
      }
    }
    return null;
  }

  /**
   * 消除指定的多行，并将上方所有未消除的行平稳下沉
   * 采用全新数组构建，彻底避免逐行 splice 带来的索引偏移问题
   */
  public removeRowsAndDrop(clearedRowIndices: number[]): void {
    if (clearedRowIndices.length === 0) return;

    const clearedSet = new Set(clearedRowIndices);
    const newMatrix: CellType[][] = [];

    // 1. 顶部填充全新空行
    for (let i = 0; i < clearedRowIndices.length; i++) {
      newMatrix.push(new Array(this.cols).fill(CellType.EMPTY));
    }

    // 2. 依次压入所有非消除行
    for (let r = 0; r < this.rows; r++) {
      if (!clearedSet.has(r)) {
        newMatrix.push([...this.data[r]]);
      }
    }

    this.data = newMatrix;
  }

  /**
   * 获取底层数据矩阵浅拷贝
   */
  public getMatrix(): CellType[][] {
    return this.data;
  }
}
