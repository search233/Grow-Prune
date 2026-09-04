import { CellType, Point } from '../core/types';
import { Tetromino } from '../core/Tetromino';

export interface GameEventMap {
  'snake:move': { head: Point };
  'snake:eat': { type: CellType.FOOD | CellType.BONUS_FOOD; pos: Point; growth: number; points: number };
  'snake:severed': { index: number; severedSegments: Point[] };
  'piece:move': { piece: Tetromino };
  'piece:rotate': { piece: Tetromino };
  'piece:lock': { piece: Tetromino; cells: Point[] };
  'piece:hard_drop': { landingY: number; cells: Point[] };
  'line:cleared': { rows: number[]; count: number; bonusFoods: Point[] };
  'game:over': { reason: string };
  'game:start': void;
  'game:restart': void;
  'score:update': { score: number };
  'time:update': { seconds: number };
}

type EventCallback<T> = (payload: T) => void;

export class EventBus {
  private listeners: { [K in keyof GameEventMap]?: EventCallback<any>[] } = {};

  public on<K extends keyof GameEventMap>(event: K, callback: EventCallback<GameEventMap[K]>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback);

    return () => this.off(event, callback);
  }

  public off<K extends keyof GameEventMap>(event: K, callback: EventCallback<GameEventMap[K]>): void {
    const arr = this.listeners[event];
    if (arr) {
      this.listeners[event] = arr.filter(cb => cb !== callback);
    }
  }

  public emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    const arr = this.listeners[event];
    if (arr) {
      // 拷贝副本执行，防止回调中反注册破坏迭代
      [...arr].forEach(cb => cb(payload));
    }
  }

  public clear(): void {
    this.listeners = {};
  }
}
