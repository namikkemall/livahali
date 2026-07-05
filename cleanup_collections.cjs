const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'data', 'collections');
const indexContent = fs.readFileSync(path.join(dir, 'index.ts'), 'utf8');

// Find all imported filenames from index.ts
const importedFiles = new Set();
const importRegex = /import\s+\{[^}]+\}\s+from\s+['"]\.\/([^'"]+)['"]/g;
let match;
while ((match = importRegex.exec(indexContent)) !== null) {
  importedFiles.add(match[1] + '.ts');
}

// Ensure index.ts itself is kept
importedFiles.add('index.ts');

const allFiles = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

let deletedCount = 0;
allFiles.forEach(file => {
  if (!importedFiles.has(file)) {
    fs.unlinkSync(path.join(dir, file));
    console.log(`Deleted: ${file}`);
    deletedCount++;
  }
});

console.log(`Cleanup complete! Deleted ${deletedCount} unused files.`);
