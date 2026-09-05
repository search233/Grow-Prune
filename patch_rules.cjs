const fs = require('fs');
const file = 'index.html';
let content = fs.readFileSync(file, 'utf-8');

// 1. Update Quick Start Tab
const oldQuickCoop = `<div class="quick-coop-item">
              <span class="item-title">🌟 共生消行</span>
              <span class="item-desc">方块与蛇身拼满整行消除！多消阶梯爆发（最高2000分），肉身筑桥每格额外+50分！</span>
            </div>
            <div class="quick-coop-item">
              <span class="item-title"><svg class="game-gem-icon cyan" viewBox="0 0 24 24"><use href="#gem-cyan-icon"></use></svg> 断尾爆晶</span>
              <span class="item-desc">消行断尾获修剪补偿（+20分/节），原地爆出高能棱晶（+200分且身长+3回血）！</span>
            </div>`;

const newQuickCoop = `<div class="quick-coop-item">
              <span class="item-title">🌟 穿针引线</span>
              <span class="item-desc">方块与蛇身拼满整行进入待发！直到【蛇尾】拖入瞬间才消除！垂直填补多行会引发极速拉链爆炸！</span>
            </div>
            <div class="quick-coop-item">
              <span class="item-title"><svg class="game-gem-icon cyan" viewBox="0 0 24 24"><use href="#gem-cyan-icon"></use></svg> 精准断尾</span>
              <span class="item-desc">消行只精准切除填缝的尾巴（+20分/节），原地爆出高能棱晶（+200分且身长+3回血）！</span>
            </div>`;

content = content.replace(oldQuickCoop, newQuickCoop);

// 2. Update Rules Tab
const oldRules = `<strong>🌟 共生消行与肉身筑桥 (Symbiotic Clear)</strong>：
                任意整行只要被【方块】与【蛇身】拼满即刻消除！基础分呈阶梯非线性爆发（1行 200 / 2行 500 / 3行 1000 / 4行 2000 分）；<strong>被消行中每包含 1 个蛇身格子额外奖励 +50 分</strong>！
              </li>
              <li>
                <strong>✂️ 断尾修剪与反哺 (Prune & Rebirth)</strong>：
                消行切断蛇身获得修剪补偿（<strong>每切断 1 节 +20 分</strong>），断尾处原地爆出 <svg class="game-gem-icon cyan" viewBox="0 0 24 24"><use href="#gem-cyan-icon"></use></svg> <strong>高能棱晶（+200 分与 +3 身长）</strong>，反哺贪吃蛇迅速重塑身躯！`;

const newRules = `<strong>🌟 穿针引线与拉链连消 (Threading & Zipper Clear)</strong>：
                当【方块】与【蛇身】拼满整行时，该行会进入“满行待发”状态。<strong>直到蛇的最末端（蛇尾）滑入该行时</strong>，才会真正触发消除！如果蛇身垂直填补了多行缺口，随着蛇尾滑过，将引发震撼的“拉链式”连续爆破！（基础分 1行 200 分，<strong>被消行中每包含 1 个蛇身格子额外奖励 +50 筑桥分</strong>）
              </li>
              <li>
                <strong>✂️ 精准断尾与反哺 (Prune & Rebirth)</strong>：
                得益于延迟消行机制，消行时系统<strong>只会精准切除用于填缝的那一小截蛇尾</strong>（每节 +20 补偿分），再也不用担心被拦腰截断！同时断尾处原地爆出 <svg class="game-gem-icon cyan" viewBox="0 0 24 24"><use href="#gem-cyan-icon"></use></svg> <strong>高能棱晶（+200 分与 +3 身长）</strong>，反哺贪吃蛇迅速重塑身躯！`;

content = content.replace(oldRules, newRules);

fs.writeFileSync(file, content);
console.log('Patched index.html rules section');
