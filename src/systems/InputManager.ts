import { InputAction } from '../core/types';

export type ActionHandler = (action: InputAction) => void;

export class InputManager {
  private handler: ActionHandler | null = null;
  private isSoftDropHeld = false;
  private onUserInteraction?: () => void;

  constructor(handler?: ActionHandler, onUserInteraction?: () => void) {
    if (handler) this.handler = handler;
    if (onUserInteraction) this.onUserInteraction = onUserInteraction;

    this.bindEvents();
  }

  public setHandler(handler: ActionHandler): void {
    this.handler = handler;
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.onUserInteraction?.();

      let action: InputAction | null = null;

      switch (e.code) {
        // P1 俄罗斯方块 (WASD + Space)
        case 'KeyA':
          action = InputAction.P1_MOVE_LEFT;
          e.preventDefault();
          break;
        case 'KeyD':
          action = InputAction.P1_MOVE_RIGHT;
          e.preventDefault();
          break;
        case 'KeyW':
          action = InputAction.P1_ROTATE_CW;
          e.preventDefault();
          break;
        case 'KeyS':
          if (!this.isSoftDropHeld) {
            this.isSoftDropHeld = true;
            action = InputAction.P1_SOFT_DROP_START;
          }
          e.preventDefault();
          break;
        case 'Space':
          action = InputAction.P1_HARD_DROP;
          e.preventDefault();
          break;

        // P2 贪吃蛇 (方向键)
        case 'ArrowUp':
          action = InputAction.P2_UP;
          e.preventDefault();
          break;
        case 'ArrowDown':
          action = InputAction.P2_DOWN;
          e.preventDefault();
          break;
        case 'ArrowLeft':
          action = InputAction.P2_LEFT;
          e.preventDefault();
          break;
        case 'ArrowRight':
          action = InputAction.P2_RIGHT;
          e.preventDefault();
          break;

        case 'Enter':
          action = InputAction.START_GAME;
          e.preventDefault();
          break;

        // 系统控制
        case 'KeyR':
          action = InputAction.RESTART;
          e.preventDefault();
          break;

        case 'KeyH':
        case 'Escape':
          action = InputAction.TOGGLE_HELP;
          e.preventDefault();
          break;

        case 'KeyM':
          action = InputAction.TOGGLE_MUTE;
          e.preventDefault();
          break;
      }

      if (action && this.handler) {
        this.handler(action);
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.code === 'KeyS') {
        this.isSoftDropHeld = false;
        if (this.handler) {
          this.handler(InputAction.P1_SOFT_DROP_END);
        }
      }
    });
  }
}
