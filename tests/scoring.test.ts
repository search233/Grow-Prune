import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/core/GameState';
import { EventBus } from '../src/systems/EventBus';
import { CellType } from '../src/core/types';
import {
  SCORE_EAT_FOOD,
  SCORE_EAT_BONUS_FOOD,
  SCORE_HARD_DROP_PER_CELL,
  SCORE_LINE_CLEAR_TABLE,
  SCORE_PER_SECOND_MULTIPLIER,
  SCORE_SEVERED_SEGMENT_BONUS,
  SCORE_SOFT_DROP_PER_CELL,
  SCORE_SYMBIOTIC_SEGMENT_BONUS,
  COLS,
  ROWS
} from '../src/core/Constants';
import { Tetromino } from '../src/core/Tetromino';

describe('Scoring System - Scheme 1 (Symbiosis Depth & Action Incentives)', () => {
  let eventBus: EventBus;
  let state: GameState;

  beforeEach(() => {
    eventBus = new EventBus();
    state = new GameState(eventBus);
    state.prepare();
    state.start();
  });

  it('should verify scoring constants match Scheme 1 design', () => {
    expect(SCORE_PER_SECOND_MULTIPLIER).toBe(2);
    expect(SCORE_EAT_FOOD).toBe(20);
    expect(SCORE_EAT_BONUS_FOOD).toBe(200);
    expect(SCORE_LINE_CLEAR_TABLE).toEqual([0, 200, 500, 1000, 2000]);
    expect(SCORE_SYMBIOTIC_SEGMENT_BONUS).toBe(50);
    expect(SCORE_SEVERED_SEGMENT_BONUS).toBe(20);
    expect(SCORE_HARD_DROP_PER_CELL).toBe(2);
    expect(SCORE_SOFT_DROP_PER_CELL).toBe(1);
  });

  it('should award correct passive survival points per second', () => {
    // Initial snake length is 3
    expect(state.snake.length).toBe(3);
    const initialScore = state.stats.score;

    state.tickScore();

    expect(state.stats.survivalSeconds).toBe(1);
    expect(state.stats.score).toBe(initialScore + 3 * SCORE_PER_SECOND_MULTIPLIER);
  });

  it('should award correct points when eating normal food and bonus food', () => {
    // 1. Normal food
    const head = state.snake.getHead();
    const foodTarget = { x: head.x, y: head.y - 1 };
    state.grid.set(foodTarget.x, foodTarget.y, CellType.FOOD);

    const scoreBeforeFood = state.stats.score;
    state.tickSnake();
    expect(state.stats.score).toBe(scoreBeforeFood + SCORE_EAT_FOOD);

    // 2. Bonus food (should award 200 points)
    const newHead = state.snake.getHead();
    const bonusTarget = { x: newHead.x, y: newHead.y - 1 };
    state.grid.set(bonusTarget.x, bonusTarget.y, CellType.BONUS_FOOD);

    const scoreBeforeBonus = state.stats.score;
    state.tickSnake();
    expect(state.stats.score).toBe(scoreBeforeBonus + SCORE_EAT_BONUS_FOOD);
  });

  it('should award soft drop points when piece descends during soft drop', () => {
    state.isSoftDropping = true;
    const initialScore = state.stats.score;

    // Trigger one tetris tick (with soft drop active)
    state.tickTetris(50);

    expect(state.stats.score).toBe(initialScore + SCORE_SOFT_DROP_PER_CELL);
  });

  it('should award hard drop points based on drop distance', () => {
    // Position snake out of drop path so it doesn't get smashed in the center
    state.snake.reset([{ x: 1, y: 15 }, { x: 1, y: 16 }, { x: 1, y: 17 }]);

    // Current piece starts near top (y = 0)
    expect(state.currentPiece).not.toBeNull();
    const initialY = state.currentPiece!.y;
    const ghostY = state.currentPiece!.getGhostDropY(state.grid);
    const expectedDistance = ghostY - initialY;
    expect(expectedDistance).toBeGreaterThan(0);

    const initialScore = state.stats.score;
    state.hardDropTetris();

    expect(state.stats.score).toBe(initialScore + expectedDistance * SCORE_HARD_DROP_PER_CELL);
  });

  it('should calculate ladder multi-line clear score and flesh bridge bonus', () => {
    // Clear out active piece so it does not interfere
    state.currentPiece = null;

    // Fill row (ROWS - 1) with BLOCK except 2 cells
    const targetRow = ROWS - 1;
    for (let c = 0; c < COLS; c++) {
      state.grid.set(c, targetRow, CellType.BLOCK);
    }
    state.grid.set(10, targetRow, CellType.EMPTY);
    state.grid.set(11, targetRow, CellType.EMPTY);

    // Position snake so head is safe above, and body occupies (10, targetRow) and (11, targetRow)
    // Snake: head at (10, targetRow - 1), body1 at (10, targetRow), body2 at (11, targetRow), tail at (11, targetRow - 1)
    state.snake.reset([
      { x: 10, y: targetRow - 1 }, // head (not on targetRow)
      { x: 10, y: targetRow },     // body on targetRow (symbiotic segment 1)
      { x: 11, y: targetRow },     // body on targetRow (symbiotic segment 2)
      { x: 11, y: targetRow - 1 }  // tail (severed)
    ]);

    const initialScore = state.stats.score;
    let eventReceived: any = null;
    eventBus.on('line:cleared', (e) => {
      eventReceived = e;
    });

    // Advance snake (step forward) to trigger processSymbioticLineClear
    // Direction was reset up (-1), next position is (10, targetRow - 2)
    state.tickSnake();

    // Line targetRow should have been cleared!
    // Expected scoring components:
    // Base: 1 line = 200 (SCORE_LINE_CLEAR_TABLE[1])
    // Symbiotic bonus: 2 segments on targetRow * 50 = 100
    // Prune bonus: 2 severed segments on targetRow * 20 = 40
    // Total expected for line clear: 200 + 100 + 40 = 340
    expect(eventReceived).not.toBeNull();
    expect(eventReceived.count).toBe(1);
    expect(eventReceived.basePoints).toBe(200);
    expect(eventReceived.symbioticBonus).toBe(100);
    expect(eventReceived.pruneBonus).toBe(2 * SCORE_SEVERED_SEGMENT_BONUS);
    expect(eventReceived.points).toBe(200 + 100 + 40);

    expect(state.stats.score).toBe(initialScore + (200 + 100 + 40));
  });

  it('should award prune compensation score when falling piece smashes snake body', () => {
    // Setup snake: head at (5, 10), body1 at (5, 11), body2 at (5, 12), body3 at (5, 13)
    state.snake.reset([
      { x: 5, y: 10 },
      { x: 5, y: 11 },
      { x: 5, y: 12 },
      { x: 5, y: 13 }
    ]);
    expect(state.snake.length).toBe(4);

    const initialScore = state.stats.score;

    let severedEvent: any = null;
    eventBus.on('snake:severed', (e) => {
      severedEvent = e;
    });

    // Simulate piece starting at y = 11, moving down to y = 12 onto (5, 12)
    state.currentPiece = new Tetromino('O');
    state.currentPiece.x = 4;
    state.currentPiece.y = 11; // occupies (4, 11), (5, 11), (4, 12), (5, 12); after tickTetris: y=12

    // Tick tetris to trigger resolvePieceSmash
    state.tickTetris(0);

    // Snake should be severed starting from index 2 ({5, 12})
    // Severed segments: {5, 12} and {5, 13} -> 2 segments severed
    // Prune bonus: 2 * 20 = 40 points!
    expect(state.snake.length).toBe(2);
    expect(severedEvent).not.toBeNull();
    expect(severedEvent.points).toBe(2 * SCORE_SEVERED_SEGMENT_BONUS);
    expect(state.stats.score).toBe(initialScore + 2 * SCORE_SEVERED_SEGMENT_BONUS);
  });
});
