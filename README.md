# Grow & Prune

> Global Game Jam Entry  
> A symbiotic co-op puzzle arcade game combining **Tetris** and **Snake** on a single grid.

---

## 🎮 Introduction (游戏简介)

**Grow & Prune** is an arcade survival puzzle where two classic mechanics intertwine on the same board:
- **Grow (生长)**: Player 1 drops tetromino blocks, leaving strategic gaps. Player 2 controls the snake, eating gems to grow and threading into the gaps to complete full lines.
- **Prune (修剪与反哺)**: Completing a row triggers a line clear, neatly pruning only the tail segment used to bridge the gap and dropping high-energy prism crystals (+200 pts, +3 length) to regrow!

---

## 🕹️ Controls (操作说明)

| Role | Action | Key |
| :--- | :--- | :--- |
| **P1 Tetris (俄罗斯方块)** | Move Left / Right | `A` / `D` |
| | Rotate Piece | `W` |
| | Soft Drop | `S` (+1 pt/cell) |
| | Hard Drop | `Space` (+2 pts/cell) |
| **P2 Snake (贪吃蛇)** | Steer Direction | Arrow Keys `↑` `↓` `←` `→` |
| **Global** | Start Game / Pause | `Space` / `Enter` / `P` |
| | Restart | `R` |
| | Help / Rules | `H` |
| | Toggle Mute | `M` |

---

## 🚀 How to Run from Source (源码运行方式)

### Requirements
- [Node.js](https://nodejs.org/) (v18+)
- npm

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production
npm run build

# 4. Package standalone web release
npm run package
```

---

## 🛠️ Tech Stack (技术栈)

- **Language:** TypeScript, HTML5, CSS3
- **Rendering:** Native HTML5 2D Canvas API
- **Audio:** Web Audio API (Synthesized SFX + BGM)
- **Build Tool:** Vite
- **Testing:** Vitest
- **Audio Asset:** BGM "Puzzle Pieces" by Abstraction (CC0)
