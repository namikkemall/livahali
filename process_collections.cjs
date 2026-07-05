const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'data', 'collections');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'index.ts');

let totalDupes = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Add coverImage property if missing
  if (!content.includes('coverImage:')) {
    content = content.replace(/(brand:\s*['"][^'"]+['"],)/, '$1\n  coverImage: "",');
    changed = true;
  }

  // 2. Find and remove duplicates (simple block removal for identical objects, or by ID)
  // Let's first just identify them to be safe before overwriting.
  const nameMatches = [...content.matchAll(/"name":\s*"([^"]+)"/g)];
  const names = nameMatches.map(m => m[1]);
  
  const uniqueNames = new Set();
  const dupes = new Set();
  names.forEach(n => {
    if (uniqueNames.has(n)) dupes.add(n);
    uniqueNames.add(n);
  });
  
  if (dupes.size > 0) {
    console.log(`${file} has duplicates:`, [...dupes]);
    totalDupes += dupes.size;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log(`Finished processing. Total duplicate products found: ${totalDupes}`);
