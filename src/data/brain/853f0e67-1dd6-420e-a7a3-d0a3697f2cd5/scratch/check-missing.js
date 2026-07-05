import fs from 'fs';
import path from 'path';

// Recreate loadKarmenCollections logic to see what's missing
const OUTPUT_FILE = path.join(process.cwd(), 'src/data/karmen-details.json');
const collectionsDir = path.join(process.cwd(), 'src/data/collections');

let existingData = {};
if (fs.existsSync(OUTPUT_FILE)) {
  existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
}

const files = fs.readdirSync(collectionsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');
const missingByCollection = {};

for (const file of files) {
  const content = fs.readFileSync(path.join(collectionsDir, file), 'utf-8');
  if (!content.includes("brand: 'karmen'")) continue;
  if (content.includes('iletisim') || content.includes('teslimat') || content.includes('hali-koleksiyonlari')) continue;

  const idMatch = content.match(/id:\s*"([^"]+)"/);
  if (!idMatch) continue;
  const collectionSlug = idMatch[1];

  const productIds = [];
  const idRegex = /"id":\s*"([^"]+)"/g;
  let match;
  let isFirst = true;
  while ((match = idRegex.exec(content)) !== null) {
    if (isFirst) { isFirst = false; continue; }
    if (/-v\d+$/.test(match[1])) continue;
    productIds.push(match[1]);
  }

  const missing = productIds.filter(pid => !existingData[pid]);
  if (missing.length > 0) {
    missingByCollection[collectionSlug] = {
      total: productIds.length,
      missingCount: missing.length,
      missing: missing
    };
  }
}

console.log(JSON.stringify(missingByCollection, null, 2));
