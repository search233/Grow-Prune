const fs = require('fs');
const file = 'src/core/CollisionEngine.ts';
let content = fs.readFileSync(file, 'utf-8');

const targetStr = `      for (let c = 0; c < grid.cols; c++) {
        const isBlock = (grid.get(c, r) === CellType.BLOCK);
        const isSnakeBody = snakeBody.some(s => s.x === c && s.y === r);

        if (!isBlock && !isSnakeBody) {
          isLineFull = false;
          break;
        }
      }

      if (isLineFull) {
        clearedRows.push(r);
      }`;

const replacementStr = `      let hasSnakeBody = false;
      let hasTail = false;
      const tail = snakeBody.length > 0 ? snakeBody[snakeBody.length - 1] : null;

      for (let c = 0; c < grid.cols; c++) {
        const isBlock = (grid.get(c, r) === CellType.BLOCK);
        
        let isSnakeBodyCell = false;
        let isTailCell = false;

        for (const s of snakeBody) {
          if (s.x === c && s.y === r) {
            isSnakeBodyCell = true;
            if (tail && s.x === tail.x && s.y === tail.y) {
              isTailCell = true;
            }
          }
        }

        if (!isBlock && !isSnakeBodyCell) {
          isLineFull = false;
          break;
        }

        if (isSnakeBodyCell) {
          hasSnakeBody = true;
          if (isTailCell) {
            hasTail = true;
          }
        }
      }

      if (isLineFull && (!hasSnakeBody || hasTail)) {
        clearedRows.push(r);
      }`;

if (content.includes('const isSnakeBody = snakeBody.some(s => s.x === c && s.y === r);')) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(file, content);
  console.log('Patched CollisionEngine.ts for Delayed Clear!');
} else {
  console.log('Target string not found in CollisionEngine.ts');
}
