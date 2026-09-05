const fs = require('fs');
const file = 'tests/line_clear.test.ts';
let content = fs.readFileSync(file, 'utf-8');

// The original test snake:
// const snake = new Snake([
//   { x: 7, y: 18 }, // head (not on cleared line)
//   { x: 7, y: 19 }, // body on line 19
//   { x: 8, y: 19 }, // body on line 19
//   { x: 9, y: 19 }, // body on line 19
//   { x: 9, y: 18 }  // tail
// ]);

// Change to:
// const snake = new Snake([
//   { x: 7, y: 17 }, // head
//   { x: 7, y: 18 }, // body
//   { x: 7, y: 19 }, // body
//   { x: 8, y: 19 }, // body
//   { x: 9, y: 19 }  // tail
// ]);
content = content.replace(
  `    const snake = new Snake([
      { x: 7, y: 18 }, // head (not on cleared line)
      { x: 7, y: 19 }, // body on line 19
      { x: 8, y: 19 }, // body on line 19
      { x: 9, y: 19 }, // body on line 19
      { x: 9, y: 18 }  // tail
    ]);`,
  `    const snake = new Snake([
      { x: 7, y: 17 }, // head (not on cleared line)
      { x: 7, y: 18 }, // body
      { x: 7, y: 19 }, // body on line 19
      { x: 8, y: 19 }, // body on line 19
      { x: 9, y: 19 }  // tail on line 19 (TRIGGERS DELAYED CLEAR)
    ]);`
);

// We need to adjust `severedSegments` check in the test.
// Earliest index in row 19 is `{ x: 7, y: 19 }` which is index 2.
// The severed segments will be indices 2, 3, 4. Length = 3.
content = content.replace(
  `expect(result.severedSegments.length).toBe(4);`,
  `expect(result.severedSegments.length).toBe(3);`
);

fs.writeFileSync(file, content);
console.log('Patched line_clear.test.ts');
