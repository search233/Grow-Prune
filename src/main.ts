import { BLOCK_SIZE, COLS, ROWS } from './core/Constants';
import { CellType, GameStatus, InputAction } from './core/types';
import { GameState } from './core/GameState';
import { ClockSystem } from './systems/ClockSystem';
import { EventBus } from './systems/EventBus';
import { InputManager } from './systems/InputManager';
import { SoundEngine } from './systems/SoundEngine';
import { CameraShake } from './render/CameraShake';
import { CanvasRenderer } from './render/CanvasRenderer';
import { ParticleSystem } from './render/ParticleSystem';
import { HUD } from './ui/HUD';
import { GameOverModal } from './ui/GameOverModal';
import { StartScreen } from './ui/StartScreen';

// 初始化并启动游戏
function bootstrap(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const nextCanvas = document.getElementById('nextCanvas') as HTMLCanvasElement;

  canvas.width = COLS * BLOCK_SIZE;
  canvas.height = ROWS * BLOCK_SIZE;

  // 1. 初始化事件总线与核心状态
  const eventBus = new EventBus();
  const gameState = new GameState(eventBus);

  // 2. 初始化驱动系统
  const soundEngine = new SoundEngine(eventBus);
  const particleSystem = new ParticleSystem(eventBus);
  const cameraShake = new CameraShake();

  // 震屏事件订阅
  eventBus.on('piece:hard_drop', () => cameraShake.trigger(6));
  eventBus.on('snake:severed', () => cameraShake.trigger(8));
  eventBus.on('line:cleared', () => cameraShake.trigger(10));
  eventBus.on('game:over', () => cameraShake.trigger(12));

  // 3. 初始化表现层与界面
  const renderer = new CanvasRenderer(canvas, cameraShake, particleSystem);

  const hud = new HUD(
    {
      score: document.getElementById('ui-score')!,
      length: document.getElementById('ui-length')!,
      time: document.getElementById('ui-time')!,
      lines: document.getElementById('ui-lines')!,
      best: document.getElementById('ui-best')!,
      nextCanvas: nextCanvas
    },
    eventBus
  );

  // 4. 双时钟系统
  const clock = new ClockSystem({
    onSnakeTick: () => gameState.tickSnake(),
    onTetrisTick: (deltaMs) => gameState.tickTetris(deltaMs),
    onScoreTick: () => gameState.tickScore()
  });

  // 5. 游戏说明展示逻辑 (预先声明 startScreen 引用)
  let startScreen: StartScreen;

  const openHelp = () => {
    if (gameState.status === GameStatus.RUNNING) {
      gameState.status = GameStatus.PAUSED;
      clock.pause();
      startScreen.show(true, false);
    } else if (gameState.status === GameStatus.GAME_OVER) {
      startScreen.show(true, true);
    } else if (gameState.status === GameStatus.READY) {
      startScreen.show(false, false);
    }
  };

  // 5. 游戏结束弹窗
  const modal = new GameOverModal(
    {
      overlay: document.getElementById('game-over-overlay')!,
      reasonText: document.getElementById('go-reason-text')!,
      finalScore: document.getElementById('final-score')!,
      finalLength: document.getElementById('final-length')!,
      finalTime: document.getElementById('final-time')!,
      btnRestart: document.getElementById('btn-restart') as HTMLButtonElement,
      btnHelp: document.getElementById('btn-go-help') as HTMLButtonElement | undefined
    },
    () => {
      gameState.reset();
      clock.reset();
    },
    () => {
      openHelp();
    },
    eventBus
  );

  eventBus.on('game:over', ({ reason }) => {
    modal.show(reason, gameState.stats, hud.formatTime(gameState.stats.survivalSeconds));
  });

  // 6. 开始界面与说明弹窗
  startScreen = new StartScreen(
    {
      overlay: document.getElementById('start-screen-overlay')!,
      btnStart: document.getElementById('btn-start-game') as HTMLButtonElement,
      titleElement: document.getElementById('start-title')!,
      tabBtnQuick: document.getElementById('tab-btn-quick'),
      tabBtnManual: document.getElementById('tab-btn-manual'),
      tabPaneQuick: document.getElementById('tab-pane-quick'),
      tabPaneManual: document.getElementById('tab-pane-manual')
    },
    {
      onStart: () => {
        soundEngine.init();
        gameState.start();
        clock.reset();
      },
      onResume: () => {
        if (gameState.status === GameStatus.PAUSED) {
          gameState.status = GameStatus.RUNNING;
          clock.resume();
        }
      }
    }
  );

  // 快捷说明按钮
  const btnHelp = document.getElementById('btn-open-help');
  if (btnHelp) {
    btnHelp.addEventListener('click', openHelp);
  }

  // 侧栏快捷重置按钮
  const btnSidebarReset = document.getElementById('btn-sidebar-reset');
  if (btnSidebarReset) {
    btnSidebarReset.addEventListener('click', () => {
      modal.hide();
      startScreen.hide();
      gameState.reset();
      clock.reset();
    });
  }

  // 7. 语义输入系统
  new InputManager(
    (action: InputAction) => {
      // 若处于开始界面或暂停说明中
      if (startScreen.isVisible()) {
        if (action === InputAction.START_GAME || action === InputAction.P1_HARD_DROP) {
          startScreen.handleAction();
          return;
        }
        if (action === InputAction.TOGGLE_HELP) {
          startScreen.handleAction();
          return;
        }
        if (action === InputAction.RESTART) {
          modal.hide();
          startScreen.hide();
          gameState.reset();
          clock.reset();
          return;
        }
        return;
      }

      switch (action) {
        // 开始与说明
        case InputAction.START_GAME:
          if (gameState.status === GameStatus.READY) {
            gameState.start();
            clock.reset();
          }
          break;

        case InputAction.TOGGLE_HELP:
          openHelp();
          break;

        // P1 俄罗斯方块
        case InputAction.P1_MOVE_LEFT:
          gameState.moveTetris(-1);
          break;
        case InputAction.P1_MOVE_RIGHT:
          gameState.moveTetris(1);
          break;
        case InputAction.P1_ROTATE_CW:
          gameState.rotateTetris();
          break;
        case InputAction.P1_SOFT_DROP_START:
          gameState.isSoftDropping = true;
          break;
        case InputAction.P1_SOFT_DROP_END:
          gameState.isSoftDropping = false;
          break;
        case InputAction.P1_HARD_DROP:
          gameState.hardDropTetris();
          break;

        // P2 贪吃蛇转向
        case InputAction.P2_UP:
          gameState.snake.setDirection({ x: 0, y: -1 });
          break;
        case InputAction.P2_DOWN:
          gameState.snake.setDirection({ x: 0, y: 1 });
          break;
        case InputAction.P2_LEFT:
          gameState.snake.setDirection({ x: -1, y: 0 });
          break;
        case InputAction.P2_RIGHT:
          gameState.snake.setDirection({ x: 1, y: 0 });
          break;

        // 重启
        case InputAction.RESTART:
          modal.hide();
          startScreen.hide();
          gameState.reset();
          clock.reset();
          break;
      }
    },
    () => soundEngine.init()
  );

  // 8. 准备初始盘面，并展示开始说明界面
  gameState.prepare();
  startScreen.show(false);

  // 9. 渲染主循环
  function loop(now: number): void {
    clock.update(now, gameState.isSoftDropping);
    cameraShake.update();
    particleSystem.update();
    hud.updateStats(gameState.stats, gameState.nextPieceType);
    renderer.render(gameState);

    requestAnimationFrame(loop);
  }

  // 10. 开发者调试钩子 (浏览器 F12 控制台机制测试套件)
  if (typeof window !== 'undefined') {
    (window as any).game = {
      state: gameState,
      clock,
      eventBus,
      renderer,
      hud,
      // 机制快捷测试函数
      setupLineClearTest: () => {
        const lastRow = gameState.grid.rows - 1;
        for (let x = 0; x < gameState.grid.cols - 2; x++) {
          gameState.grid.set(x, lastRow, 1);
        }
        console.log(`%c[Test]%c 已在第 ${lastRow} 行左侧铺设方块，操控蛇身穿过右侧空隙即可触发【共生消行】！`, 'color: #4ade80; font-weight: bold;', 'color: inherit;');
      },
      growSnake: (amount = 5) => {
        gameState.snake.addGrowth(amount);
        console.log(`%c[Test]%c 蛇身已增加 ${amount} 节储备生长量，当前身长: ${gameState.snake.length} (随着移动将持续长长)`, 'color: #38bdf8; font-weight: bold;', 'color: inherit;');
      },
      spawnBonusFood: () => {
        const head = gameState.snake.getHead();
        const dir = gameState.snake.direction;
        const targetPt = {
          x: (head.x + dir.x * 2 + gameState.grid.cols) % gameState.grid.cols,
          y: (head.y + dir.y * 2 + gameState.grid.rows) % gameState.grid.rows
        };
        gameState.grid.set(targetPt.x, targetPt.y, CellType.BONUS_FOOD);
        console.log(`%c[Test]%c 已在坐标 (${targetPt.x}, ${targetPt.y}) 生成高能棱晶 💎 (+3 身长)！`, 'color: #38bdf8; font-weight: bold;', 'color: inherit;');
      },
      killSnake: (reason = '手动测试死亡') => {
        eventBus.emit('game:over', { reason });
      }
    };
    console.log('%c[Tetrisnake Debug]%c 机制调试套件已挂载至 window.game，可在控制台输入 game.setupLineClearTest() 等进行测试。', 'color: #38bdf8; font-weight: bold;', 'color: inherit;');
  }

  requestAnimationFrame(loop);
}

// 页面加载完成后启动
window.addEventListener('DOMContentLoaded', () => {
  bootstrap();
});
