import { GameStats } from '../core/types';
import { EventBus } from '../systems/EventBus';

export class GameOverModal {
  private overlay: HTMLElement;
  private reasonText: HTMLElement;
  private finalScore: HTMLElement;
  private finalLength: HTMLElement;
  private finalTime: HTMLElement;
  private btnRestart: HTMLButtonElement;
  private btnHelp?: HTMLButtonElement;
  private onRestartCallback?: () => void;
  private onHelpCallback?: () => void;

  constructor(
    elements: {
      overlay: HTMLElement;
      reasonText: HTMLElement;
      finalScore: HTMLElement;
      finalLength: HTMLElement;
      finalTime: HTMLElement;
      btnRestart: HTMLButtonElement;
      btnHelp?: HTMLButtonElement;
    },
    onRestart?: () => void,
    onHelp?: () => void,
    eventBus?: EventBus
  ) {
    this.overlay = elements.overlay;
    this.reasonText = elements.reasonText;
    this.finalScore = elements.finalScore;
    this.finalLength = elements.finalLength;
    this.finalTime = elements.finalTime;
    this.btnRestart = elements.btnRestart;
    this.btnHelp = elements.btnHelp;
    this.onRestartCallback = onRestart;
    this.onHelpCallback = onHelp;

    this.btnRestart.addEventListener('click', () => {
      this.hide();
      this.onRestartCallback?.();
    });

    if (this.btnHelp) {
      this.btnHelp.addEventListener('click', () => {
        this.onHelpCallback?.();
      });
    }

    if (eventBus) {
      this.attachToEventBus(eventBus);
    }
  }

  public attachToEventBus(eventBus: EventBus): void {
    eventBus.on('game:restart', () => {
      this.hide();
    });
  }

  public show(reason: string, stats: GameStats, formattedTime: string): void {
    this.reasonText.textContent = reason;
    this.finalScore.textContent = String(stats.score).padStart(10, '0');
    this.finalLength.textContent = String(stats.snakeLength).padStart(2, '0');
    this.finalTime.textContent = formattedTime;
    this.overlay.style.display = 'flex';
  }

  public hide(): void {
    this.overlay.style.display = 'none';
  }
}
