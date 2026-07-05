import fs from 'fs';
import path from 'path';

const detailsFile = path.join(process.cwd(), 'src/data/karmen-details.json');
const details = JSON.parse(fs.readFileSync(detailsFile, 'utf-8'));

let total = 0;
let hasRealDescription = 0;
let missingInJson = 0;

console.log("Checking karmen-details.json...");

for (const [id, data] of Object.entries(details)) {
  total++;
  if (data.description && data.description.trim() !== '' && !data.description.includes('premium carpet model')) {
    hasRealDescription++;
  } else {
    missingInJson++;
    console.log(`Missing description for: ${id}`);
  }
}

console.log(`\nkarmen-details.json: ${hasRealDescription} / ${total} have descriptions.`);
console.log(`${missingInJson} / ${total} are missing or use fallback.`);

