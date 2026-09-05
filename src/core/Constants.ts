import { TetrominoType } from './types';

export const COLS = 22;
export const ROWS = 24;
export const BLOCK_SIZE = 24;

// 时钟与延迟配置 (毫秒)
export const SNAKE_TICK_INTERVAL_MS = 190;      // 优化步伐节奏：0.19s (约 5.26 格/秒，手感更轻快灵敏)
export const TETRIS_NORMAL_INTERVAL_MS = 600;   // 方块普通下落 0.6s
export const TETRIS_SOFT_DROP_INTERVAL_MS = 50; // 软降加速 0.05s
export const TETRIS_LOCK_DELAY_MS = 500;        // 触底锁定延迟 0.5s（现代 Tetris 核心规范）

// 计分配置（方案一：共生深度与动作激励型）
export const SCORE_PER_SECOND_MULTIPLIER = 2;       // 存活秒分平衡：2分/节/秒（根治挂机刷分倒挂）
export const SCORE_EAT_FOOD = 20;                   // 基础食物得分
export const SCORE_EAT_BONUS_FOOD = 200;            // 高能棱晶回收得分（100基础+100回收加成）
export const SCORE_LINE_CLEAR = 200;                // 单行消除保底参考分
export const SCORE_LINE_CLEAR_TABLE = [0, 200, 500, 1000, 2000]; // 阶梯多行消除分 (1~4行非线性爆发)
export const SCORE_SYMBIOTIC_SEGMENT_BONUS = 50;    // 肉身筑桥加成：参与消行的蛇身每格额外奖50分
export const SCORE_SEVERED_SEGMENT_BONUS = 20;      // 断尾修剪补偿：切除的蛇身每节奖20分
export const SCORE_HARD_DROP_PER_CELL = 2;          // 硬降每格高度加分 (经典 Tetris 规范)
export const SCORE_SOFT_DROP_PER_CELL = 1;          // 软降每格高度加分

// 7 种俄罗斯方块原型配置
export interface TetrominoDefinition {
  type: TetrominoType;
  color: string;
  matrix: number[][];
}

export const TETROMINO_DEFINITIONS: Record<TetrominoType, TetrominoDefinition> = {
  I: {
    type: 'I',
    color: '#06b6d4', // 霓虹青
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]
  },
  J: {
    type: 'J',
    color: '#3b82f6', // 霓虹蓝
    matrix: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ]
  },
  L: {
    type: 'L',
    color: '#f97316', // 霓虹橙
    matrix: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ]
  },
  O: {
    type: 'O',
    color: '#eab308', // 霓虹黄
    matrix: [
      [1, 1],
      [1, 1]
    ]
  },
  S: {
    type: 'S',
    color: '#10b981', // 浅绿
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ]
  },
  T: {
    type: 'T',
    color: '#a855f7', // 霓虹紫
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ]
  },
  Z: {
    type: 'Z',
    color: '#ef4444', // 霓虹红
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ]
  }
};

export const ALL_TETROMINO_TYPES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
