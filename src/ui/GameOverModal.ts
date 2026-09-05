import { GameStats } from '../core/types';
import { EventBus } from '../systems/EventBus';

export class GameOverModal {
  private overlay: HTMLElement;
  private reasonText: HTMLElement;
  private finalScore: HTMLElement;
  private finalLines: HTMLElement;
  private finalLength: HTMLElement;
  private finalTime: HTMLElement;
  private newRecordBadge: HTMLElement;
  private btnRestart: HTMLButtonElement;
  private btnHelp?: HTMLButtonElement;
  private onRestartCallback?: () => void;
  private onHelpCallback?: () => void;

  constructor(
    elements: {
      overlay: HTMLElement;
      reasonText: HTMLElement;
      finalScore: HTMLElement;
      finalLines: HTMLElement;
      finalLength: HTMLElement;
      finalTime: HTMLElement;
      newRecordBadge: HTMLElement;
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
    this.finalLines = elements.finalLines;
    this.finalLength = elements.finalLength;
    this.finalTime = elements.finalTime;
    this.newRecordBadge = elements.newRecordBadge;
    this.btnRestart = elements.btnRestart;
    this.btnHelp = elements.btnHelp;
    this.onRestartCallback = onRestart;
    this.onHelpCallback = onHelp;

    this.btnRestart.addEventListener('click', () => {
      eventBus?.emit('ui:click', undefined as void);
      this.hide();
      this.onRestartCallback?.();
    });

    if (this.btnHelp) {
      this.btnHelp.addEventListener('click', () => {
        eventBus?.emit('ui:click', undefined as void);
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
    this.reasonText.textContent = `致命异常：${reason}`;
    this.finalScore.textContent = String(stats.score).padStart(10, '0');
    this.finalLines.textContent = String(stats.linesCleared).padStart(2, '0');
    this.finalLength.textContent = String(stats.snakeLength).padStart(2, '0');
    this.finalTime.textContent = formattedTime;

    const isNewRecord = stats.score > 0 && stats.score >= stats.highScore;
    if (isNewRecord) {
      this.newRecordBadge.style.display = 'block';
    } else {
      this.newRecordBadge.style.display = 'none';
    }

    this.overlay.style.display = 'flex';
  }

  public hide(): void {
    this.overlay.style.display = 'none';
  }
}
