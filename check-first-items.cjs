const fs = require('fs');
const details = require('./src/data/karmen-details.json');
const files = fs.readdirSync('./src/data/collections').filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'saten-sisal.ts');
let missingFirst = [];
for (const file of files) {
  const content = fs.readFileSync('./src/data/collections/' + file, 'utf8');
  const match = content.match(/"id":\s*"([^"]+)"/);
  if (match) {
    const id = match[1];
    const detail = details[id];
    if (!detail || !detail.specs || Object.keys(detail.specs).length === 0 || !detail.sizes || detail.sizes.length === 0) {
      missingFirst.push({
        file, 
        id, 
        hasDetail: !!detail, 
        hasSpecs: !!(detail && detail.specs && Object.keys(detail.specs).length > 0), 
        hasSizes: !!(detail && detail.sizes && detail.sizes.length > 0)
      });
    }
  }
}
console.log('Missing first products:', missingFirst.length);
console.table(missingFirst);
