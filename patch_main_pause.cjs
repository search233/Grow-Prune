const fs = require('fs');
const file = 'src/main.ts';
let content = fs.readFileSync(file, 'utf-8');

// 1. Insert togglePause logic
const helpLogic = `  let startScreen: StartScreen;

  const pauseOverlay = document.getElementById('pause-overlay')!;

  const togglePause = () => {
    if (gameState.status === GameStatus.RUNNING) {
      gameState.status = GameStatus.PAUSED;
      clock.pause();
      eventBus.emit('game:pause', undefined as void);
      pauseOverlay.style.display = 'flex';
    } else if (gameState.status === GameStatus.PAUSED && pauseOverlay.style.display === 'flex') {
      gameState.status = GameStatus.RUNNING;
      clock.resume();
      eventBus.emit('game:resume', undefined as void);
      pauseOverlay.style.display = 'none';
    }
  };

  const openHelp = () => {
    if (gameState.status === GameStatus.RUNNING) {
      gameState.status = GameStatus.PAUSED;
      clock.pause();
      eventBus.emit('game:pause', undefined as void);
      startScreen.show(true, false);
    } else if (gameState.status === GameStatus.PAUSED && pauseOverlay.style.display === 'flex') {
      // Switch from pause overlay to help screen
      pauseOverlay.style.display = 'none';
      startScreen.show(true, false);
    } else if (gameState.status === GameStatus.GAME_OVER) {
      startScreen.show(true, true);
    } else if (gameState.status === GameStatus.READY) {
      startScreen.show(false, false);
    }
  };`;
content = content.replace(/  let startScreen: StartScreen;[\s\S]*?  const openHelp = \(\) => \{[\s\S]*?\};/, helpLogic);

// 2. Hide pause overlay on reset
content = content.replace(/gameState\.reset\(\);\s*clock\.reset\(\);/g, "pauseOverlay.style.display = 'none';\n      gameState.reset();\n      clock.reset();");

// 3. Handle pause overlay state in InputManager
const inputLogic = `  // 7. 语义输入系统
  new InputManager(
    (action: InputAction) => {
      // 若处于开始界面或说明中
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
          pauseOverlay.style.display = 'none';
          gameState.reset();
          clock.reset();
          return;
        }
        if (action === InputAction.TOGGLE_MUTE) {
          soundEngine.toggleMute();
          updateSoundUI();
          return;
        }
        return;
      }

      // 若处于单纯的暂停遮罩中
      if (pauseOverlay.style.display === 'flex') {
        if (action === InputAction.TOGGLE_PAUSE || action === InputAction.START_GAME || action === InputAction.P1_HARD_DROP) {
          togglePause(); // resume
          return;
        }
        if (action === InputAction.TOGGLE_HELP) {
          openHelp();
          return;
        }
        if (action === InputAction.RESTART) {
          modal.hide();
          pauseOverlay.style.display = 'none';
          gameState.reset();
          clock.reset();
          return;
        }
        if (action === InputAction.TOGGLE_MUTE) {
          soundEngine.toggleMute();
          updateSoundUI();
          return;
        }
        return;
      }

      switch (action) {`;

content = content.replace(/  \/\/ 7\. 语义输入系统[\s\S]*?      switch \(action\) \{/, inputLogic);

// 4. Add TOGGLE_PAUSE in the switch cases for RUNNING state
const pauseCase = `        case InputAction.TOGGLE_HELP:
          openHelp();
          break;

        case InputAction.TOGGLE_PAUSE:
          togglePause();
          break;`;
content = content.replace(/        case InputAction\.TOGGLE_HELP:\s*openHelp\(\);\s*break;/, pauseCase);

fs.writeFileSync(file, content);
console.log('Patched main.ts for Pause logic');
