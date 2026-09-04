/**
 * 网格中单元格类型
 */
export enum CellType {
  EMPTY = 0,
  BLOCK = 1,       // 固化落稳的俄罗斯方块
  SNAKE_BODY = 2,  // 蛇身节点
  SNAKE_HEAD = 3,  // 蛇头节点
  FOOD = 4,        // 普通食物（+1 长度）
  BONUS_FOOD = 5   // 共生消行产生的高能食物（+3 长度，高分）
}

/**
 * 2D 整数坐标
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 向量方向
 */
export interface Direction {
  x: number;
  y: number;
}

/**
 * 经典俄罗斯方块 7 种类型
 */
export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

/**
 * 游戏运行状态
 */
export enum GameStatus {
  READY = 'READY',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

/**
 * 实时统计指标
 */
export interface GameStats {
  score: number;
  snakeLength: number;
  linesCleared: number;
  survivalSeconds: number;
  highScore: number;
}

/**
 * 动作语义指令（解耦底层键码）
 */
export enum InputAction {
  // P1 俄罗斯方块控制 (WASD + Space)
  P1_MOVE_LEFT = 'P1_MOVE_LEFT',
  P1_MOVE_RIGHT = 'P1_MOVE_RIGHT',
  P1_ROTATE_CW = 'P1_ROTATE_CW',
  P1_SOFT_DROP_START = 'P1_SOFT_DROP_START',
  P1_SOFT_DROP_END = 'P1_SOFT_DROP_END',
  P1_HARD_DROP = 'P1_HARD_DROP',

  // P2 贪吃蛇转向 (方向键)
  P2_UP = 'P2_UP',
  P2_DOWN = 'P2_DOWN',
  P2_LEFT = 'P2_LEFT',
  P2_RIGHT = 'P2_RIGHT',

  // 通用控制
  START_GAME = 'START_GAME',
  RESTART = 'RESTART',
  TOGGLE_HELP = 'TOGGLE_HELP',
  TOGGLE_PAUSE = 'TOGGLE_PAUSE'
}
