import fs from 'fs';
import path from 'path';

const DETAILS_FILE = path.join(process.cwd(), 'src/data/karmen-details.json');
const karmenDetails = JSON.parse(fs.readFileSync(DETAILS_FILE, 'utf-8'));

karmenDetails["trend-2809"] = {
  "description": "Karmen Halı Trend 2809 modeli, modern ve zarif tasarımıyla eviniz için şık bir atmosfer oluşturur.",
  "specs": {
    "Malzeme": "Polyester, Pamuk",
    "Taban Malzemesi": "Pamuk",
    "Hav Yüksekliği": "8mm",
    "Ek Özellikler": "Kolay Temizlenir, Tozu Az, Dayanıklı Yapı"
  },
  "highlights": [
    "Modern ve minimalist çizgilere sahip şık görünüm",
    "Pamuk tabanı sayesinde zemine tam uyum sağlar",
    "Kolay temizlenebilen pratik kullanım"
  ],
  "notes": "Halı temizliğinde çamaşır suyu veya ağartıcı kimyasallar kullanılmamalıdır."
};

fs.writeFileSync(DETAILS_FILE, JSON.stringify(karmenDetails, null, 2), 'utf-8');
console.log("✅ Patched trend-2809 successfully!");
