const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'data', 'collections');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'index.ts');

const globalNames = new Map();
const duplicates = [];

files.forEach(file => {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Try matching both "name": "..." and name: "..."
  const nameMatches = [...content.matchAll(/(?:"name"|name):\s*"([^"]+)"/g)];
  
  nameMatches.forEach(match => {
    const name = match[1];
    if (globalNames.has(name)) {
      duplicates.push({ name, file1: globalNames.get(name), file2: file });
    } else {
      globalNames.set(name, file);
    }
  });
});

console.log("Global duplicates:");
console.log(duplicates);
