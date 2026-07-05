const fs = require('fs');
const path = require('path');
const collectionsDir = path.join(process.cwd(), 'src/data/collections');
const publicDir = path.join(process.cwd(), 'public');

const files = fs.readdirSync(collectionsDir).filter(f => f.endsWith('.ts'));
let missingImages = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(collectionsDir, file), 'utf-8');
  const imageRegex = /\"?imagePath\"?:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = imageRegex.exec(content)) !== null) {
    let imgPath = match[1];
    if (imgPath.startsWith('/')) imgPath = imgPath.substring(1);
    const fullPath = path.join(publicDir, imgPath);
    if (!fs.existsSync(fullPath)) {
      missingImages.push({ file, imgPath });
    }
  }
}

if (missingImages.length === 0) {
  console.log('All images exist.');
} else {
  console.log('Found ' + missingImages.length + ' missing images:');
  missingImages.forEach(m => console.log(m.file + ': ' + m.imgPath));
}
