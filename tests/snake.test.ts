import { describe, it, expect } from 'vitest';
import { COLS, ROWS } from '../src/core/Constants';
import { Snake } from '../src/core/Snake';

describe('Snake Domain Model', () => {
  const midX = Math.floor(COLS / 2);
  const startY = Math.floor(ROWS * 0.7);

  it('should initialize with default 3-segment body and facing upward', () => {
    const snake = new Snake();
    expect(snake.length).toBe(3);
    expect(snake.getHead()).toEqual({ x: midX, y: startY });
    expect(snake.direction).toEqual({ x: 0, y: -1 });
  });

  it('should advance forward and move tail when no growth pending', () => {
    const snake = new Snake();
    const nextHead = snake.peekNextHeadPosition();
    expect(nextHead).toEqual({ x: midX, y: startY - 1 });

    snake.advance(nextHead);
    expect(snake.length).toBe(3);
    expect(snake.getHead()).toEqual({ x: midX, y: startY - 1 });
    expect(snake.getSegments()[1]).toEqual({ x: midX, y: startY });
    expect(snake.getSegments()[2]).toEqual({ x: midX, y: startY + 1 });
  });

  it('should grow when growth is pending (tail does not pop)', () => {
    const snake = new Snake();
    snake.addGrowth(1);
    expect(snake.pendingGrowth).toBe(1);

    const nextHead = snake.peekNextHeadPosition();
    snake.advance(nextHead);

    expect(snake.length).toBe(4);
    expect(snake.pendingGrowth).toBe(0);
    expect(snake.getSegments()[3]).toEqual({ x: midX, y: startY + 2 });
  });

  it('should reject immediate 180-degree reversal', () => {
    const snake = new Snake(); // facing { x: 0, y: -1 } (UP)
    const reversed = snake.setDirection({ x: 0, y: 1 }); // DOWN
    expect(reversed).toBe(false);

    // Lateral turns are allowed
    const turnedLeft = snake.setDirection({ x: -1, y: 0 }); // LEFT
    expect(turnedLeft).toBe(true);
  });

  it('should sever body correctly retaining [0, idx - 1]', () => {
    const snake = new Snake([
      { x: 5, y: 10 },
      { x: 5, y: 11 },
      { x: 5, y: 12 },
      { x: 5, y: 13 },
      { x: 5, y: 14 }
    ]);
    expect(snake.length).toBe(5);

    // Sever starting from index 2 (which is { x: 5, y: 12 })
    const severed = snake.severFrom(2);

    expect(snake.length).toBe(2);
    expect(snake.getSegments()).toEqual([
      { x: 5, y: 10 },
      { x: 5, y: 11 }
    ]);
    expect(severed).toEqual([
      { x: 5, y: 12 },
      { x: 5, y: 13 },
      { x: 5, y: 14 }
    ]);
  });

  it('should support direction queue for quick double-turning without swallowing inputs', () => {
    // 蛇初始朝上 (0, -1)
    const snake = new Snake();
    expect(snake.direction).toEqual({ x: 0, y: -1 });

    // 玩家在同一 Tick 间隔内快速连续按下向右 (1, 0) 与向下 (0, 1)
    const turnRight = snake.setDirection({ x: 1, y: 0 });
    expect(turnRight).toBe(true);

    // 此时眼睛视觉反馈立即指向右方
    expect(snake.visualDirection).toEqual({ x: 1, y: 0 });

    // 紧接着按下向下（原本会被直接判为与当前向上相反自杀而丢弃，现在应基于向右合法入队）
    const turnDown = snake.setDirection({ x: 0, y: 1 });
    expect(turnDown).toBe(true);

    // 此时眼睛视觉反馈立即指向最新按下的下方
    expect(snake.visualDirection).toEqual({ x: 0, y: 1 });

    // 第 1 步步进：执行队列中第 1 个指令（向右）
    const next1 = snake.peekNextHeadPosition();
    snake.advance(next1);
    expect(snake.direction).toEqual({ x: 1, y: 0 });

    // 第 2 步步进：执行队列中第 2 个指令（向下）
    const next2 = snake.peekNextHeadPosition();
    snake.advance(next2);
    expect(snake.direction).toEqual({ x: 0, y: 1 });
  });
});
