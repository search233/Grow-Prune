import { describe, it, expect } from 'vitest';
import { CollisionEngine } from '../src/core/CollisionEngine';
import { Grid } from '../src/core/Grid';
import { Snake } from '../src/core/Snake';
import { CellType } from '../src/core/types';

describe('CollisionEngine - Movement & Smashes', () => {
  it('should detect boundary death when snake heads out of grid', () => {
    const grid = new Grid(10, 20);
    const snake = new Snake([{ x: 0, y: 0 }], { x: -1, y: 0 }); // heading left from 0,0

    const check = CollisionEngine.checkSnakeMove(snake, grid, null);
    expect(check.canMove).toBe(false);
    expect(check.deathReason).toContain('边界');
  });

  it('should detect death when snake heads into static BLOCK', () => {
    const grid = new Grid(10, 20);
    grid.set(5, 4, CellType.BLOCK);
    const snake = new Snake([{ x: 5, y: 5 }], { x: 0, y: -1 });

    const check = CollisionEngine.checkSnakeMove(snake, grid, null);
    expect(check.canMove).toBe(false);
    expect(check.deathReason).toContain('坚固方块');
  });

  it('should detect death on self-bite', () => {
    const grid = new Grid(10, 20);
    // U-shaped snake
    const snake = new Snake([
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 4, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 2 }
    ], { x: 0, y: -1 }); // next is (3, 2), which is snake[3]

    const check = CollisionEngine.checkSnakeMove(snake, grid, null);
    expect(check.canMove).toBe(false);
    expect(check.deathReason).toContain('身体');
  });

  it('should allow stepping into tail cell if tail is vacating this turn', () => {
    const grid = new Grid(10, 20);
    // 4 segments in a loop: (3,3) -> (4,3) -> (4,2) -> (3,2)
    // next pos is (3,2), which is tail at index 3. No growth pending.
    const snake = new Snake([
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 4, y: 2 },
      { x: 3, y: 2 }
    ], { x: 0, y: -1 });

    const check = CollisionEngine.checkSnakeMove(snake, grid, null);
    expect(check.canMove).toBe(true);
  });

  it('should detect fatal smash when falling piece hits snake head', () => {
    const snake = new Snake([
      { x: 5, y: 10 },
      { x: 5, y: 11 }
    ]);

    const smash = CollisionEngine.resolveSmashSnake([{ x: 5, y: 10 }], snake);
    expect(smash.hitHead).toBe(true);
  });

  it('should trigger tail severing when falling piece hits snake body', () => {
    const snake = new Snake([
      { x: 5, y: 10 }, // head
      { x: 5, y: 11 }, // body 1
      { x: 5, y: 12 }, // body 2 (hit!)
      { x: 5, y: 13 }  // body 3
    ]);

    const smash = CollisionEngine.resolveSmashSnake([{ x: 5, y: 12 }], snake);
    expect(smash.hitHead).toBe(false);
    expect(smash.hitBody).toBe(true);
    expect(smash.minHitIndex).toBe(2);
    expect(snake.length).toBe(2);
    expect(smash.severedSegments).toEqual([
      { x: 5, y: 12 },
      { x: 5, y: 13 }
    ]);
  });
});
