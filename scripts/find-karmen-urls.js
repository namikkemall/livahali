import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const BASE_URL = 'https://karmenhali.com';

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

function getSearchCode(pid) {
  // Extract patterns like ze001g, vk001g, ft002b, dk018g, sm015a, zn010a, tv012a, mr004a, lb003w, lk002g, lp024w
  const match = pid.match(/(?:[a-zA-Z]+-)?([a-zA-Z]{2}\d{3}[a-zA-Z]?|\d{4,5}[a-zA-Z]?)/);
  if (match) {
    return match[1];
  }
  
  const parts = pid.split('-');
  if (parts.length > 1) {
    if (parts[0] === 'touch') return 'th001';
    return parts[1];
  }
  return pid;
}

async function findUrls() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const urlMap = {};
  console.log(`🔎 Toplam ${missingProducts.length} ürün için URL arama başlatılıyor...`);
  
  for (let i = 0; i < missingProducts.length; i++) {
    const pid = missingProducts[i];
    const searchCode = getSearchCode(pid);
    console.log(`\n[${i+1}/${missingProducts.length}] ID: ${pid} -> Arama kodu: "${searchCode}"`);
    
    const searchUrl = `${BASE_URL}/Arama?1&kelime=${searchCode}`;
    
    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1000);
      
      const pageLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => a.href)
          .filter(href => href && href.startsWith('https://karmenhali.com/'));
      });
      
      const uniqueProductLinks = [...new Set(pageLinks)].map(l => l.split('#')[0].split('?')[0]).filter(href => {
        const path = href.replace('https://karmenhali.com/', '');
        if (path.includes('Arama') || path.includes('sepet') || path.includes('uye-') || path.includes('iletisim') || path.includes('Uye') || path === '') {
          return false;
        }
        
        // Product URL must contain the search code (e.g. ft002b)
        // This prevents matching category pages (e.g. /fontana)
        return path.toLowerCase().includes(searchCode.toLowerCase());
      });
      
      if (uniqueProductLinks.length > 0) {
        console.log(`   Found candidates:`);
        uniqueProductLinks.forEach(l => console.log(`    - ${l}`));
        
        // Find best match:
        // Try to match the exact pid or a link containing the key parts of pid
        const pidParts = pid.split('-');
        let bestLink = null;
        
        // Score candidates based on how many parts of pid they match
        let bestScore = -1;
        for (const link of uniqueProductLinks) {
          const lowerLink = link.toLowerCase();
          let score = 0;
          for (const part of pidParts) {
            if (part && lowerLink.includes(part.toLowerCase())) {
              score++;
            }
          }
          // Bonus score if it matches the code exactly
          if (lowerLink.includes(searchCode.toLowerCase())) {
            score += 2;
          }
          if (score > bestScore) {
            bestScore = score;
            bestLink = link;
          }
        }
        
        urlMap[pid] = bestLink;
        console.log(`   👉 Seçilen En İyi Eşleşme: ${bestLink} (Score: ${bestScore})`);
      } else {
        console.log(`   ❌ Arama sonucunda uygun ürün linki bulunamadı.`);
      }
      
    } catch (err) {
      console.error(`   ❌ Arama hatası: ${err.message}`);
    }
  }
  
  const savePath = path.join(process.cwd(), 'src/data/brain/853f0e67-1dd6-420e-a7a3-d0a3697f2cd5/scratch/discovered-urls.json');
  fs.writeFileSync(savePath, JSON.stringify(urlMap, null, 2), 'utf-8');
  console.log(`\n🎉 Bitti! Discovered URLs written to ${savePath}`);
  
  await browser.close();
}

findUrls();
