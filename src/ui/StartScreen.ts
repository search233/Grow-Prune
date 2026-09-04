export class StartScreen {
  private overlay: HTMLElement;
  private btnStart: HTMLButtonElement;
  private titleElement: HTMLElement | null;
  private tabBtnQuick?: HTMLElement | null;
  private tabBtnManual?: HTMLElement | null;
  private tabPaneQuick?: HTMLElement | null;
  private tabPaneManual?: HTMLElement | null;
  private onStartCallback?: () => void;
  private onResumeCallback?: () => void;
  private isHelpMode = false;
  private isGameOverHelp = false;

  constructor(
    elements: {
      overlay: HTMLElement;
      btnStart: HTMLButtonElement;
      titleElement?: HTMLElement;
      tabBtnQuick?: HTMLElement | null;
      tabBtnManual?: HTMLElement | null;
      tabPaneQuick?: HTMLElement | null;
      tabPaneManual?: HTMLElement | null;
    },
    callbacks?: {
      onStart?: () => void;
      onResume?: () => void;
    }
  ) {
    this.overlay = elements.overlay;
    this.btnStart = elements.btnStart;
    this.titleElement = elements.titleElement || null;
    this.tabBtnQuick = elements.tabBtnQuick || null;
    this.tabBtnManual = elements.tabBtnManual || null;
    this.tabPaneQuick = elements.tabPaneQuick || null;
    this.tabPaneManual = elements.tabPaneManual || null;
    this.onStartCallback = callbacks?.onStart;
    this.onResumeCallback = callbacks?.onResume;

    this.btnStart.addEventListener('click', () => {
      this.handleAction();
    });

    this.tabBtnQuick?.addEventListener('click', () => {
      this.switchTab('quick');
    });

    this.tabBtnManual?.addEventListener('click', () => {
      this.switchTab('manual');
    });
  }

  public switchTab(tab: 'quick' | 'manual'): void {
    if (!this.tabBtnQuick || !this.tabBtnManual || !this.tabPaneQuick || !this.tabPaneManual) return;

    if (tab === 'quick') {
      this.tabBtnQuick.classList.add('active');
      this.tabBtnQuick.setAttribute('aria-selected', 'true');
      this.tabBtnManual.classList.remove('active');
      this.tabBtnManual.setAttribute('aria-selected', 'false');

      this.tabPaneQuick.classList.add('active');
      this.tabPaneManual.classList.remove('active');
    } else {
      this.tabBtnManual.classList.add('active');
      this.tabBtnManual.setAttribute('aria-selected', 'true');
      this.tabBtnQuick.classList.remove('active');
      this.tabBtnQuick.setAttribute('aria-selected', 'false');

      this.tabPaneManual.classList.add('active');
      this.tabPaneQuick.classList.remove('active');
    }
  }

  public show(isHelp = false, isGameOver = false): void {
    this.isHelpMode = isHelp;
    this.isGameOverHelp = isGameOver;
    if (this.titleElement) {
      this.titleElement.textContent = isHelp ? 'GROW & PRUNE - 规则说明' : 'GROW & PRUNE';
    }
    if (isGameOver) {
      this.btnStart.textContent = '返回结算 (BACK)';
      this.switchTab('manual');
    } else if (isHelp) {
      this.btnStart.textContent = '返回游戏 (RESUME)';
      this.switchTab('manual');
    } else {
      this.btnStart.textContent = 'START GAME (开始游戏)';
      this.switchTab('quick');
    }
    this.overlay.style.display = 'flex';
  }

  public hide(): void {
    this.overlay.style.display = 'none';
  }

  public isVisible(): boolean {
    return this.overlay.style.display === 'flex' || this.overlay.style.display === 'block';
  }

  public handleAction(): void {
    this.hide();
    if (this.isHelpMode) {
      if (!this.isGameOverHelp) {
        this.onResumeCallback?.();
      }
    } else {
      this.onStartCallback?.();
    }
  }

  public toggle(isGameActive: boolean, isGameOver = false): void {
    if (this.isVisible()) {
      this.handleAction();
    } else {
      this.show(isGameActive, isGameOver);
    }
  }
}
