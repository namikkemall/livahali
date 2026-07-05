import fs from 'fs';
import path from 'path';

const collectionsDir = path.join(process.cwd(), 'src/data/collections');
const files = fs.readdirSync(collectionsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts' && !f.includes('hali-koleksiyonlari') && !f.includes('iletisim') && !f.includes('teslimat'));

let totalModels = 0;
let missingDescriptions = 0;

const collectionStats = {};

for (const file of files) {
  const content = fs.readFileSync(path.join(collectionsDir, file), 'utf-8');
  
  // Extract all description fields
  const descriptionRegex = /"description": "(.*)"/g;
  let match;
  
  let colTotal = 0;
  let colMissing = 0;
  
  while ((match = descriptionRegex.exec(content)) !== null) {
    colTotal++;
    totalModels++;
    
    // Check if it's the fallback description
    if (match[1].includes('premium carpet model.')) {
      colMissing++;
      missingDescriptions++;
    }
  }
  
  if (colTotal > 0) {
    collectionStats[file.replace('.ts', '')] = {
      total: colTotal,
      missing: colMissing,
      missingPercent: Math.round((colMissing / colTotal) * 100)
    };
  }
}

console.log("=== COLLECTION STATS ===");
for (const [col, stats] of Object.entries(collectionStats)) {
  if (stats.missing > 0) {
    console.log(`${col.padEnd(20)}: ${stats.missing} / ${stats.total} missing (${stats.missingPercent}%)`);
  }
}
console.log("========================");
console.log(`TOTAL: ${missingDescriptions} / ${totalModels} missing (${Math.round((missingDescriptions / totalModels) * 100)}%)`);
