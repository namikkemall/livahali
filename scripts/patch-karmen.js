import fs from 'fs';
import path from 'path';

const detailsFile = path.join(process.cwd(), 'src/data/karmen-details.json');
const details = JSON.parse(fs.readFileSync(detailsFile, 'utf-8'));

const collectionsDir = path.join(process.cwd(), 'src/data/collections');
const files = fs.readdirSync(collectionsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');

let patchedCount = 0;

for (const file of files) {
  const filePath = path.join(collectionsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let hasChanges = false;
  
  // Match id, name, description on consecutive lines
  const productRegex = /"id":\s*"([^"]+)",\s*"name":\s*"[^"]+",\s*"description":\s*"([^"]+)"/g;
  
  let match;
  let newContent = content;
  
  while ((match = productRegex.exec(content)) !== null) {
    const id = match[1];
    const currentDesc = match[2];
    
    // Check if we have a real description in karmen-details.json
    let detailsData = details[id];
    
    // If not found by exact ID, try to find a key that starts with the ID
    if (!detailsData) {
      const matchingKey = Object.keys(details).find(k => k.startsWith(id));
      if (matchingKey) {
        detailsData = details[matchingKey];
      }
    }

    if (detailsData && detailsData.description && !detailsData.description.includes('premium carpet model')) {
      const realDesc = detailsData.description.replace(/"/g, '\\"').replace(/\n/g, ' '); // escape quotes and newlines
      
      if (currentDesc !== realDesc) {
        const toReplace = `"description": "${currentDesc}"`;
        const replacement = `"description": "${realDesc}"`;
        
        const pos = newContent.indexOf(toReplace, newContent.indexOf(`"id": "${id}"`));
        if (pos !== -1) {
            newContent = newContent.substring(0, pos) + replacement + newContent.substring(pos + toReplace.length);
            hasChanges = true;
            patchedCount++;
        }
      }
    }
  }
  
  if (hasChanges) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Patched ${file}`);
  }
}

console.log(`Successfully patched ${patchedCount} product descriptions across collection files.`);
