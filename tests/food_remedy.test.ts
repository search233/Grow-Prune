import { describe, it, expect } from 'vitest';
import { GameState } from '../src/core/GameState';
import { EventBus } from '../src/systems/EventBus';
import { CellType, GameStatus } from '../src/core/types';
import { Tetromino } from '../src/core/Tetromino';

describe('Food Locking Remedy & Supply Guarantee', () => {
  it('should float food to the top surface of a locking block column', () => {
    const eventBus = new EventBus();
    const gameState = new GameState(eventBus);
    gameState.start();

    // 清空现有食物，手动设置测试场景
    for (let y = 0; y < gameState.grid.rows; y++) {
      for (let x = 0; x < gameState.grid.cols; x++) {
        gameState.grid.set(x, y, CellType.EMPTY);
      }
    }

    // 设置地面支撑 (5, 16) 和 (6, 16)
    gameState.grid.set(5, 16, CellType.BLOCK);
    gameState.grid.set(6, 16, CellType.BLOCK);

    // 假设在 (5, 15) 有一颗普通食物
    gameState.grid.set(5, 15, CellType.FOOD);

    // 模拟一个 O 形方块（2x2）落稳在 x=5, y=14..15
    // 这意味着 (5, 15) 会被落稳的方块压住
    const piece = new Tetromino('O');
    piece.x = 5;
    piece.y = 14;
    gameState.currentPiece = piece;

    // 触底锁定
    gameState.tickTetris(600);

    // 验证：(5, 15) 和 (5, 14) 写入了方块
    expect(gameState.grid.get(5, 15)).toBe(CellType.BLOCK);
    expect(gameState.grid.get(5, 14)).toBe(CellType.BLOCK);

    // 验证：原先在 (5, 15) 的食物被智能浮起到新落成方块的顶表面 (5, 13)
    expect(gameState.grid.get(5, 13)).toBe(CellType.FOOD);
  });

  it('should safely rescue respawn food if column above is full', () => {
    const eventBus = new EventBus();
    const gameState = new GameState(eventBus);
    gameState.start();

    // 清空场地
    for (let y = 0; y < gameState.grid.rows; y++) {
      for (let x = 0; x < gameState.grid.cols; x++) {
        gameState.grid.set(x, y, CellType.EMPTY);
      }
    }

    // 在 (3, 1) 设置食物，且 (3, 0) 已有方块封顶（上方无空间）
    gameState.grid.set(3, 0, CellType.BLOCK);
    gameState.grid.set(3, 1, CellType.FOOD);
    gameState.grid.set(3, 3, CellType.BLOCK);
    gameState.grid.set(4, 3, CellType.BLOCK);

    // 一个方块落在 (3, 1)
    const piece = new Tetromino('O');
    piece.x = 3;
    piece.y = 1;
    gameState.currentPiece = piece;

    gameState.tickTetris(600);

    // 验证：食物没有丢失，全局依然保底拥有 FOOD
    expect(gameState.grid.hasCellType(CellType.FOOD)).toBe(true);
  });

  it('should guarantee food presence after any piece locks (global invariant)', () => {
    const eventBus = new EventBus();
    const gameState = new GameState(eventBus);
    gameState.prepare();
    gameState.start();

    // 人工移除所有食物
    for (let y = 0; y < gameState.grid.rows; y++) {
      for (let x = 0; x < gameState.grid.cols; x++) {
        if (gameState.grid.get(x, y) === CellType.FOOD) {
          gameState.grid.set(x, y, CellType.EMPTY);
        }
      }
    }
    expect(gameState.grid.hasCellType(CellType.FOOD)).toBe(false);

    // 将方块放置在边路 (x=0)，避免直接砸中位于中央 (x=7) 的蛇头
    const piece = new Tetromino('O');
    piece.x = 0;
    piece.y = 15;
    gameState.currentPiece = piece;

    // 确保任何一次方块硬降锁定都会触发 ensureFoodSupply()
    gameState.hardDropTetris();

    // 验证：硬降成功锁定且保底刷新生效
    expect(gameState.status).toBe(GameStatus.RUNNING);
    expect(gameState.grid.hasCellType(CellType.FOOD)).toBe(true);
  });
});
