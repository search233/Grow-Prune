import { describe, it, expect } from 'vitest';
import { CollisionEngine } from '../src/core/CollisionEngine';
import { Grid } from '../src/core/Grid';
import { Snake } from '../src/core/Snake';
import { CellType } from '../src/core/types';

describe('CollisionEngine - Symbiotic Line Clear', () => {
  it('should trigger symbiotic line clear when row is filled by BLOCK + SNAKE_BODY', () => {
    const grid = new Grid(10, 20);

    // Row 19: Columns 0..6 are BLOCK
    for (let c = 0; c <= 6; c++) {
      grid.set(c, 19, CellType.BLOCK);
    }
    // Set a block at row 18 to verify it drops to row 19 after clear
    grid.set(0, 18, CellType.BLOCK);

    // Snake body occupies columns 7, 8, 9 on row 19!
    // Head is at (7, 18), body is at (7, 19), (8, 19), (9, 19), and tail at (9, 18)
    const snake = new Snake([
      { x: 7, y: 17 }, // head (not on cleared line)
      { x: 7, y: 18 }, // body
      { x: 7, y: 19 }, // body on line 19
      { x: 8, y: 19 }, // body on line 19
      { x: 9, y: 19 }  // tail on line 19 (TRIGGERS DELAYED CLEAR)
    ]);

    const result = CollisionEngine.checkSymbioticLineClear(grid, snake);

    // 1. Line 19 should be cleared
    expect(result.clearedRows).toEqual([19]);

    // 2. Snake should be severed starting from the first segment on row 19 (index 1)
    expect(snake.length).toBe(2); // Head and one body segment remain
    expect(result.severedSegments.length).toBe(3);

    // 3. Block that was at (0, 18) should now have dropped down to (0, 19)
    expect(grid.get(0, 19)).toBe(CellType.BLOCK);
    expect(grid.get(0, 18)).toBe(CellType.EMPTY);

    // 4. Bonus food should have been generated
    expect(result.bonusFoodPoints.length).toBe(1);
    const bonusPt = result.bonusFoodPoints[0];
    expect(grid.get(bonusPt.x, bonusPt.y)).toBe(CellType.BONUS_FOOD);

    // 5. Symbiotic snake segments on cleared line should be 3
    expect(result.symbioticSegmentsCount).toBe(3);
  });

  it('should NOT clear line if snake head is on that line (head protection)', () => {
    const grid = new Grid(10, 20);

    // Row 19: Columns 0..8 are BLOCK
    for (let c = 0; c <= 8; c++) {
      grid.set(c, 19, CellType.BLOCK);
    }

    // Snake head is on col 9, row 19
    const snake = new Snake([
      { x: 9, y: 19 }, // head
      { x: 9, y: 18 }
    ]);

    const result = CollisionEngine.checkSymbioticLineClear(grid, snake);
    expect(result.clearedRows.length).toBe(0);
  });

  it('should sever snake body when falling blocks overlap body after line clear (Fix #2)', () => {
    const grid = new Grid(10, 20);

    // Row 19: completely full of BLOCKs (pure block line, no snake)
    for (let c = 0; c < 10; c++) {
      grid.set(c, 19, CellType.BLOCK);
    }

    // Row 18: has a block at col 5 (will fall to row 19 after clear)
    grid.set(5, 18, CellType.BLOCK);

    // Snake body is at (5, 18) — BUT wait, that conflicts with the block.
    // Instead: snake body at (5, 19-equivalent-after-drop).
    // Let's set it up so the block falls ONTO the snake body:
    // Row 17 has a block at col 3 that will fall to 18 after line 19 clears
    // Snake body segment sits at (3, 18) which will be overlapped after drop
    grid.set(3, 17, CellType.BLOCK);

    // Snake: head at (0, 15), body goes down to (3, 18)
    const snake = new Snake([
      { x: 0, y: 15 },  // head — safe
      { x: 1, y: 15 },  // body
      { x: 2, y: 15 },  // body
      { x: 3, y: 15 },  // body
      { x: 3, y: 16 },  // body
      { x: 3, y: 17 },  // body — (3,17) has a BLOCK but we clear first, then drop
      { x: 3, y: 18 },  // body — after row 19 clears, block at (3,17) drops to (3,18)!
    ]);

    // Clear row 19 → block at (3,17) drops to (3,18) → overlaps snake body at index 6
    // But first we need snake NOT to be on cleared rows for it to survive
    const result = CollisionEngine.checkSymbioticLineClear(grid, snake);

    // Row 19 is all blocks → should be cleared
    expect(result.clearedRows).toEqual([19]);

    // After drop: block from (3,17) → (3,18), snake body at (3,18) should be severed
    // The snake at index 5 was at (3,17) which also had a BLOCK — 
    // after removeRowsAndDrop, (3,17) becomes (3,18), so body at (3,18) gets crushed
    // and body at (3,17) is now safe (empty row shifted down)

    // Actually let me verify: after clearing row 19, rows shift:
    // Old row 17 → new row 18, old row 18 → new row 19
    // Block at (3,17) moves to (3,18)
    // Snake body at index 6 is at (3,18) which now has a BLOCK → severed!
    // Snake body at index 5 is at (3,17) — old row 17 shifted to 18 means 
    //   position (3,17) is now the old row 16 (empty) — so safe

    // The snake should be severed at index 6 (earliest body overlap after drop)
    expect(result.snakeCrushedByFallingBlock).toBe(false);
    expect(snake.length).toBeLessThanOrEqual(6); // severed at or before index 6
    expect(result.severedSegments.length).toBeGreaterThan(0);
  });

  it('should spawn BONUS_FOOD near sever point rather than randomly (Fix #3)', () => {
    const grid = new Grid(10, 20);

    // Row 19: Columns 0..6 are BLOCK
    for (let c = 0; c <= 6; c++) {
      grid.set(c, 19, CellType.BLOCK);
    }

    // Snake body fills columns 7, 8, 9 on row 19
    const snake = new Snake([
      { x: 7, y: 17 }, // head
      { x: 7, y: 18 }, // body
      { x: 7, y: 19 }, // body on cleared line — sever point
      { x: 8, y: 19 }, // body on cleared line
      { x: 9, y: 19 }, // body on cleared line
    ]);

    const result = CollisionEngine.checkSymbioticLineClear(grid, snake);
    expect(result.clearedRows).toEqual([19]);
    expect(result.bonusFoodPoints.length).toBe(1);

    // Bonus food should be within manhattan distance 3 of the first severed segment (7, 19)
    // After row clear, row 19 becomes empty; the sever point ref is (7, 19)
    const bonus = result.bonusFoodPoints[0];
    const severRef = { x: 7, y: 19 };
    const dist = Math.abs(bonus.x - severRef.x) + Math.abs(bonus.y - severRef.y);
    expect(dist).toBeLessThanOrEqual(3);
  });
});
