const fs = require('fs');
const file = 'index.html';
let content = fs.readFileSync(file, 'utf-8');

// The CSS we want to insert
const newCss = `    #game-over-overlay {
      position: absolute;
      inset: 0;
      background: rgba(8, 16, 26, 0.88);
      background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.2) 2px, rgba(0, 0, 0, 0.2) 4px);
      backdrop-filter: blur(8px);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      z-index: 100;
      animation: fadeIn 0.2s ease-out;
    }

    .go-title-wrapper {
      position: relative;
      margin-bottom: 8px;
    }

    .go-title {
      font-family: 'Chakra Petch', sans-serif;
      font-size: 32px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #ef4444;
      text-shadow: 0 0 16px rgba(239, 68, 68, 0.8);
      position: relative;
    }

    /* Glitch Animation */
    .glitch::before, .glitch::after {
      content: attr(data-text);
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: transparent;
    }
    .glitch::before {
      left: 2px;
      text-shadow: -1px 0 #38bdf8;
      clip: rect(24px, 550px, 90px, 0);
      animation: glitch-anim-2 3s infinite linear alternate-reverse;
    }
    .glitch::after {
      left: -2px;
      text-shadow: -1px 0 #4ade80;
      clip: rect(85px, 550px, 140px, 0);
      animation: glitch-anim 2.5s infinite linear alternate-reverse;
    }

    @keyframes glitch-anim {
      0% { clip: rect(10px, 9999px, 30px, 0); transform: skew(0.5deg); }
      20% { clip: rect(50px, 9999px, 80px, 0); transform: skew(-0.5deg); }
      40% { clip: rect(30px, 9999px, 40px, 0); transform: skew(0.5deg); }
      60% { clip: rect(70px, 9999px, 90px, 0); transform: skew(-0.5deg); }
      80% { clip: rect(20px, 9999px, 60px, 0); transform: skew(0.5deg); }
      100% { clip: rect(80px, 9999px, 100px, 0); transform: skew(-0.5deg); }
    }
    @keyframes glitch-anim-2 {
      0% { clip: rect(65px, 9999px, 100px, 0); transform: skew(0.5deg); }
      20% { clip: rect(10px, 9999px, 40px, 0); transform: skew(-0.5deg); }
      40% { clip: rect(80px, 9999px, 90px, 0); transform: skew(0.5deg); }
      60% { clip: rect(30px, 9999px, 70px, 0); transform: skew(-0.5deg); }
      80% { clip: rect(50px, 9999px, 80px, 0); transform: skew(0.5deg); }
      100% { clip: rect(20px, 9999px, 60px, 0); transform: skew(-0.5deg); }
    }

    .go-reason-wrapper {
      display: flex;
      align-items: center;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 4px;
      margin-bottom: 20px;
      overflow: hidden;
      width: 100%;
      max-width: 300px;
    }

    .hazard-stripes {
      width: 24px;
      height: 100%;
      background: repeating-linear-gradient(45deg, #ef4444, #ef4444 4px, #000 4px, #000 8px);
      align-self: stretch;
    }

    .go-reason {
      flex: 1;
      font-family: 'Share Tech Mono', monospace;
      font-size: 13px;
      color: #fca5a5;
      padding: 6px 10px;
      font-weight: bold;
    }

    .go-stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      width: 100%;
      max-width: 320px;
      margin-bottom: 24px;
    }

    .go-stat-card {
      background: rgba(14, 23, 35, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      position: relative;
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
    }

    .go-stat-card.full-width {
      grid-column: 1 / -1;
      padding: 14px;
      border-color: rgba(56, 189, 248, 0.3);
      background: linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, rgba(14, 23, 35, 0.9) 100%);
    }

    .stat-label {
      font-family: 'Chakra Petch', sans-serif;
      font-size: 10px;
      color: #94a3b8;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .stat-value {
      font-family: 'Share Tech Mono', monospace;
      font-size: 18px;
    }
    
    .go-stat-card.full-width .stat-value {
      font-size: 26px;
      letter-spacing: 2px;
    }

    .text-cyan { color: #38bdf8; text-shadow: 0 0 10px rgba(56, 189, 248, 0.6); }
    .text-gold { color: #fbbf24; text-shadow: 0 0 8px rgba(251, 191, 36, 0.6); }
    .text-green { color: #4ade80; text-shadow: 0 0 8px rgba(74, 222, 128, 0.6); }
    .text-orange { color: #fb923c; text-shadow: 0 0 8px rgba(251, 146, 60, 0.6); }

    .new-record-badge {
      position: absolute;
      top: -10px;
      right: -10px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #fff;
      font-family: 'Chakra Petch', sans-serif;
      font-size: 9px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 12px;
      border: 1px solid #fcd34d;
      box-shadow: 0 0 12px rgba(245, 158, 11, 0.8);
      transform: rotate(12deg);
      animation: pulse 1.5s infinite;
      text-shadow: none;
    }

    @keyframes pulse {
      0% { transform: rotate(12deg) scale(1); }
      50% { transform: rotate(12deg) scale(1.1); box-shadow: 0 0 20px rgba(245, 158, 11, 1); }
      100% { transform: rotate(12deg) scale(1); }
    }

    .go-btn-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      max-width: 240px;
    }

    .restart-btn {
      background: linear-gradient(180deg, #ef4444 0%, #b91c1c 100%);
      color: #ffffff;
      border: 1px solid #fca5a5;
      padding: 12px 20px;
      font-family: 'Chakra Petch', sans-serif;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 1px;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 4px 0 #7f1d1d, 0 8px 16px rgba(220, 38, 38, 0.4);
      transition: all 0.15s ease;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }

    .restart-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 5px 0 #7f1d1d, 0 10px 20px rgba(220, 38, 38, 0.6);
      filter: brightness(1.1);
    }

    .restart-btn:active {
      transform: translateY(2px);
      box-shadow: 0 2px 0 #7f1d1d;
    }

    .go-help-btn {
      background: rgba(25, 36, 50, 0.9);
      border: 1px solid #3b4e64;
      color: #94a3b8;
      font-family: 'Chakra Petch', sans-serif;
      font-size: 12px;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 3px 0 #0d1622;
      transition: all 0.15s ease;
    }

    .go-help-btn:hover {
      background: #1e3a5f;
      color: #38bdf8;
      border-color: #38bdf8;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
    }

    .go-help-btn:active {
      transform: translateY(1px);
      box-shadow: 0 1px 0 #0d1622;
    }

    .restart-hint {
      margin-top: 12px;
      font-size: 11px;
      font-family: 'Share Tech Mono', monospace;
      color: #64748b;
    }`;

const newHtml = `        <div id="game-over-overlay">
          <div class="go-title-wrapper">
            <div class="go-title glitch" data-text="SYSTEM HALT">SYSTEM HALT</div>
          </div>
          
          <div class="go-reason-wrapper">
            <div class="hazard-stripes"></div>
            <div id="go-reason-text" class="go-reason">蛇头撞墙</div>
            <div class="hazard-stripes"></div>
          </div>

          <div class="go-stats-grid">
            <div class="go-stat-card full-width">
              <span class="stat-label">FINAL SCORE</span>
              <strong id="final-score" class="stat-value text-cyan">0000000000</strong>
              <div id="new-record-badge" class="new-record-badge" style="display: none;">✨ NEW RECORD</div>
            </div>
            
            <div class="go-stat-card">
              <span class="stat-label">LINES</span>
              <strong id="final-lines" class="stat-value text-gold">00</strong>
            </div>
            
            <div class="go-stat-card">
              <span class="stat-label">LENGTH</span>
              <strong id="final-length" class="stat-value text-green">00</strong>
            </div>
            
            <div class="go-stat-card">
              <span class="stat-label">TIME</span>
              <strong id="final-time" class="stat-value text-orange">00:00</strong>
            </div>
          </div>

          <div class="go-btn-group">
            <button class="restart-btn" id="btn-restart">REBOOT SYSTEM (R)</button>
            <button class="go-help-btn" id="btn-go-help">📖 查看规则说明 (H)</button>
          </div>
          <div class="restart-hint">按 R 重新开始 • 按 H 查看规则说明</div>
        </div>`;

// Regex replace CSS block
const cssRegex = /#game-over-overlay\s*\{[\s\S]*?\.restart-hint\s*\{[^}]+\}/;
content = content.replace(cssRegex, newCss);

// Regex replace HTML block
const htmlRegex = /<div\s+id="game-over-overlay">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<!-- 右翼: P2/;
content = content.replace(htmlRegex, `${newHtml}\n      </div>\n    </div>\n\n    <!-- 右翼: P2`);

fs.writeFileSync(file, content);
console.log('Patched index.html');
