const fs = require('fs');
const d = JSON.parse(fs.readFileSync('src/data/karmen-details.json'));
Object.keys(d).forEach(k => {
  if (k.startsWith('idol') || k.startsWith('matris') || k.startsWith('viskona')) {
    let desc = d[k].description;
    const newDesc = desc.replace(/(Tabanlı|Halı) ([A-ZÇĞİÖŞÜ])/g, '$1. $2');
    if (desc !== newDesc) {
      d[k].description = newDesc;
      console.log(newDesc);
    }
  }
});
fs.writeFileSync('src/data/karmen-details.json', JSON.stringify(d, null, 2));
