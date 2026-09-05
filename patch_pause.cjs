const fs = require('fs');
const file = 'index.html';
let content = fs.readFileSync(file, 'utf-8');

const pauseOverlayHTML = `
        <!-- 纯粹的游戏暂停蒙层 -->
        <div id="pause-overlay">
          <div class="pause-text">PAUSED</div>
          <div class="pause-hint">按 P 或 ESC 恢复游戏</div>
        </div>
`;

// Insert after game-over-overlay
content = content.replace('<!-- 右翼: P2 贪吃蛇控制舱', pauseOverlayHTML + '\n    <!-- 右翼: P2 贪吃蛇控制舱');

const pauseOverlayCSS = `
    /* ==========================================================================
       6. Pause Overlay (暂停蒙层)
       ========================================================================== */
    #pause-overlay {
      position: absolute;
      inset: 0;
      background: rgba(8, 16, 26, 0.7);
      backdrop-filter: blur(4px);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 90;
    }

    .pause-text {
      font-family: 'Chakra Petch', sans-serif;
      font-size: 42px;
      font-weight: 900;
      letter-spacing: 6px;
      color: #38bdf8;
      text-shadow: 0 0 20px rgba(56, 189, 248, 0.8);
      margin-bottom: 12px;
    }

    .pause-hint {
      font-family: 'Share Tech Mono', monospace;
      font-size: 14px;
      color: #94a3b8;
    }
`;

// Insert CSS right before </style>
content = content.replace('</style>', pauseOverlayCSS + '\n  </style>');

// Also update the buttons in HTML to indicate P for pause.
// Looking for id="btn-open-help"
content = content.replace('id="btn-open-help" title="查看操作与规则说明 (H)">\n          <span>📖 说明 (H)</span>', 'id="btn-open-help" title="查看操作与规则说明 (H) / 暂停 (P)">\n          <span>📖 说明 / ⏸ 暂停</span>');


fs.writeFileSync(file, content);
console.log('Patched index.html for Pause screen');
