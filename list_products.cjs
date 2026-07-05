const fs = require('fs');

['cosmos.ts', 'quatro.ts'].forEach(f => {
  const content = fs.readFileSync('src/data/collections/' + f, 'utf8');
  const m = [...content.matchAll(/(?:"name"|name):\s*"([^"]+)"/g)].map(x=>x[1]);
  console.log(f, m);
});
