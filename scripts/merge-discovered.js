import fs from 'fs';
import path from 'path';

const discoveredPath = path.join(process.cwd(), 'src/data/brain/853f0e67-1dd6-420e-a7a3-d0a3697f2cd5/scratch/discovered-urls.json');
const discovered = JSON.parse(fs.readFileSync(discoveredPath, 'utf-8'));

// Manually add the Truva products discovered during secondary search
discovered["truva-tr036a-krem-rengi-hali-gri-ve-bej-detayli-akrilik-yumusak-salon-halisi"] = "https://karmenhali.com/truva-tr036a-krem-rengi-hali-gri-ve-bej-detayli-akrilik-yumusak-salon-halisi-241";
discovered["truva-tr032m-krem-rengi-hali-lacivert-geometrik-detayli-akrilik-yumusak-salon-halisi"] = "https://karmenhali.com/truva-tr032m-krem-rengi-hali-lacivert-geometrik-detayli-akrilik-yumusak-salon-halisi-308";
discovered["truva-tr034s-krem-hali-vizon-bej-detayli-modern-klasik-akrilik-yumusak-salon-oturma-odasi-halisi"] = "https://karmenhali.com/truva-tr034s-krem-hali-vizon-bej-detayli-modern-klasik-akrilik-yumusak-salon-oturma-odasi-halisi-311";
discovered["truva-tr035g-krem-rengi-hali-gri-geometrik-detayli-akrilik-yumusak-modern-salon-halisi"] = "https://karmenhali.com/truva-tr035g-krem-rengi-hali-gri-geometrik-detayli-akrilik-yumusak-modern-salon-halisi-237";

// Save updated discovered list
fs.writeFileSync(discoveredPath, JSON.stringify(discovered, null, 2), 'utf-8');

const missingProducts = [
  "dark-dk018g",
  "fontana-ft002b", "fontana-ft002w", "fontana-ft003p", "fontana-ft003y", "fontana-ft005p",
  "look-black-lb003w", "look-black-lb004w", "look-black-lb005w", "look-black-lb006w", "look-black-lb008g", "look-black-lb009g", "look-black-lb005z",
  "look-classic-lk002g", "look-classic-lk003g", "look-classic-lk004g", "look-classic-lk005b", "look-classic-lk005m", "look-classic-lk006b",
  "loop-lp024w",
  "lotus-8571-gri-hali-renkli-kilim-desenli-modern-ince-akrilik-tozuaz-salon-oturma-odasi-halisi",
  "lotus-8574-gri-hali-renkli-detayli-modern-ince-akrilik-tozuaz-salon-halisi-yatak-odasi-koridor",
  "lotus-8575-gri-hali-iskandinav-desenli-modern-ince-akrilik-tozuaz-salon-halisi-yatak-odasi-koridor",
  "lotus-8576-gri-hali-renkli-detay-modern-desenli-ince-akrilik-tozuaz-salon-halisi-yatak-odasi-koridor",
  "lotus-8573",
  "merit-mr004a-krem-hali-kahverengi-kenar-cerceveli-ince-yumusak-akrilik-tozuaz-modern-salon-halisi",
  "merit-mr008a-krem-hali-vizon-geometrik-desenli-ince-yumusak-akrilik-modern-salon-oturma-odasi-halisi",
  "merit-mr009a-krem-hali-geometrik-detayli-ince-yumusak-akrilik-modern-salon-oturma-odasi-halisi",
  "merit-mr010a-krem-hali-vizon-bej-geometrik-detayli-ince-yumusak-akrilik-modern-salon-halisi",
  "merit-mr011a-krem-hali-vizon-bej-rengi-geometrik-detayli-ince-yumusak-akrilik-modern-salon-halisi",
  "merit-mr003a-krem-hali-bej-detayli-ince-yumusak-akrilik-tozuaz-modern-salon-halisi-yatak-odasi",
  "touch-th001p-yuvarlak-daire", "touch-th001s-yuvarlak-daire",
  "sumer-sm015a",
  "trend-2809", "trend-04101a-oval", "trend-tr003s-oval", "trend-2803-yuvarlak", "trend-04101a-yuvarlak", "trend-tr003s-yuvarlak", "trend-tr003s", "trend-04101a",
  "truva-tv012a-bej-hali-kenar-cerceveli-kalin-akrilik-tozuaz-modern-salon-halisi-yatak-odasi-koridor",
  "truva-tr036a-krem-rengi-hali-gri-ve-bej-detayli-akrilik-yumusak-salon-halisi",
  "truva-tr032m-krem-rengi-hali-lacivert-geometrik-detayli-akrilik-yumusak-salon-halisi",
  "truva-tv032s-krem-rengi-hali-gold-geometrik-detayli-akrilik-yumusak-salon-oturma-odasi-halisi",
  "truva-tr034s-krem-hali-vizon-bej-detayli-modern-klasik-akrilik-yumusak-salon-oturma-odasi-halisi",
  "truva-tv035k", "truva-tv035m", "truva-tv035s", "truva-08342a-oval",
  "truva-tr035g-krem-rengi-hali-gri-geometrik-detayli-akrilik-yumusak-modern-salon-halisi",
  "viskona-vk001g", "viskona-vk002b", "viskona-vk002g",
  "zeen-ze001g-sisal-gri-siyah-kolay-temizlenebilir-makinede-yikanabilir-mutfak-halisi",
  "zeen-ze001w-sisal-gri-beyaz-kolay-temizlenebilir-makinede-yikanabilir-mutfak-halisi",
  "zeen-ze002b-sisal-bej-kolay-temizlenebilir-makinede-yikanabilir-mutfak-halisi",
  "zeen-ze002g-sisal-gri-beyaz-kolay-temizlenebilir-makinede-yikanabilir-mutfak-halisi",
  "zeen-ze002w-sisal-bej-beyaz-kolay-temizlenebilir-makinede-yikanabilir-mutfak-halisi",
  "zeen-ze003r-sisal-gri-kolay-temizlenebilir-makinede-yikanabilir-mutfak-halisi",
  "zeen-ze001g-ozel-olcu-kesme-hali",
  "zeen-ze001w-ozel-olcu-kesme-hali",
  "zeen-ze002b-ozel-olcu-kesme-hali",
  "zeen-ze002g-ozel-olcu-kesme-hali",
  "zeen-ze003r-ozel-olcu-kesme-hali",
  "zenith-zn010a"
];

const stillMissing = missingProducts.filter(pid => !discovered[pid]);
console.log(`Missing count now: ${stillMissing.length}`);
console.log(`Still missing:`, stillMissing);
