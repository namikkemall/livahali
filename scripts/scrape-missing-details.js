import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const DETAILS_FILE = path.join(process.cwd(), 'src/data/karmen-details.json');
const DISCOVERED_FILE = path.join(process.cwd(), 'src/data/brain/853f0e67-1dd6-420e-a7a3-d0a3697f2cd5/scratch/discovered-urls.json');

// Load current data
let karmenDetails = {};
if (fs.existsSync(DETAILS_FILE)) {
  karmenDetails = JSON.parse(fs.readFileSync(DETAILS_FILE, 'utf-8'));
}

// Load discovered URLs
const discoveredUrls = JSON.parse(fs.readFileSync(DISCOVERED_FILE, 'utf-8'));

function cleanText(txt) {
  if (!txt) return '';
  return txt.replace(/\s+/g, ' ').trim();
}

async function scrapeProductPage(page, url) {
  return page.evaluate(() => {
    const result = {
      description: '',
      specs: {},
      highlights: [],
      notes: ''
    };
    
    const container = document.querySelector('.urunTabAlt, #divProductDetailTab, .product-description, .urun-aciklama');
    if (!container) return result;
    
    // Find all H1, H2, H3, H4, P, LI inside the container
    const elements = container.querySelectorAll('h1, h2, h3, h4, p, li');
    let currentSection = '';
    
    for (const el of elements) {
      const text = el.textContent || '';
      const trimmedText = text.trim();
      if (!trimmedText) continue;
      
      // Detect sections based on header texts (which can be H-tags or P-tags)
      if (el.tagName.startsWith('H') || el.tagName === 'P') {
        if (trimmedText === 'Ürün Açıklaması' || trimmedText.startsWith('Ürün Açıklaması\n') || trimmedText.startsWith('Ürün Açıklaması\r')) {
          if (trimmedText.includes('\n') || trimmedText.includes('\r')) {
            const parts = trimmedText.split(/\r?\n/).map(p => p.trim()).filter(Boolean);
            if (parts.length > 1) {
              result.description = parts.slice(1).join(' ');
              currentSection = '';
              continue;
            }
          }
          currentSection = 'description';
          continue;
        } else if (trimmedText === 'Ürün Özellikleri' || trimmedText.includes('Teknik Özellikler') || (trimmedText.includes('Özellikler') && !trimmedText.includes('Ek') && !trimmedText.includes('Neden'))) {
          currentSection = 'specs';
          continue;
        } else if (trimmedText === 'Teknik Avantajlar' || trimmedText === 'Neden Tercih Etmelisiniz?' || trimmedText.includes('Neden') || trimmedText.includes('Seçmelisiniz') || trimmedText === 'Öne Çıkan Avantajlar') {
          currentSection = 'highlights';
          continue;
        } else if (trimmedText === 'Temizlik ve Bakım Önerileri' || trimmedText.includes('Dikkat') || trimmedText.includes('Bakım') || trimmedText.includes('Temizlik')) {
          currentSection = 'notes';
          continue;
        } else if (trimmedText === 'Ek Bilgiler' || trimmedText === 'Ek Bilgilendirme' || trimmedText === 'Önemli Bilgilendirme') {
          currentSection = 'notes';
          continue;
        }
      }
      
      // Collect content based on current section
      if (currentSection === 'description' && el.tagName === 'P') {
        result.description = trimmedText;
        currentSection = ''; // take first paragraph
        continue;
      }
      
      if (currentSection === 'specs' && el.tagName === 'LI') {
        const colonIdx = trimmedText.indexOf(':');
        if (colonIdx > 0) {
          const key = trimmedText.substring(0, colonIdx).trim();
          const val = trimmedText.substring(colonIdx + 1).trim();
          result.specs[key] = val;
        }
      }
      
      if (currentSection === 'highlights' && el.tagName === 'LI') {
        result.highlights.push(trimmedText);
      }
      
      if (currentSection === 'notes' && (el.tagName === 'P' || el.tagName === 'LI' || el.tagName === 'DIV')) {
        if (trimmedText.length > 15) {
          if (result.notes) {
            result.notes += ' ' + trimmedText;
          } else {
            result.notes = trimmedText;
          }
        }
      }
    }
    
    // Parse specs tables directly
    const tables = container.querySelectorAll('table');
    for (const table of tables) {
      const rows = table.querySelectorAll('tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const key = cells[0].textContent?.trim() || '';
          const val = cells[1].textContent?.trim() || '';
          if (key && val && key !== 'Özellik' && val !== 'Açıklama') {
            result.specs[key] = val;
          }
        }
      }
    }
    
    // Fallback for description if it wasn't matched inside a header
    if (!result.description) {
      for (const el of elements) {
        if (el.tagName.startsWith('H') || el.tagName === 'P') {
          const text = el.textContent?.trim() || '';
          if (text.length > 50 && !text.includes('Ürün Açıklaması') && !text.includes('Özellikleri') && !text.includes('Avantajlar')) {
            result.description = text;
            break;
          }
        }
      }
    }
    
    return result;
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Re-scrape if description is missing or is too short (less than 150 chars)
  const toScrape = Object.keys(discoveredUrls).filter(pid => {
    const details = karmenDetails[pid];
    if (!details || !details.description) return true;
    if (details.description.length < 150) return true;
    return false;
  });
  
  console.log(`🚀 Toplam ${toScrape.length} Karmen ürünü için detaylar yeniden çekiliyor...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < toScrape.length; i++) {
    const pid = toScrape[i];
    const url = discoveredUrls[pid];
    
    console.log(`\n[${i+1}/${toScrape.length}] Ürün: ${pid}`);
    console.log(`   🔗 URL: ${url}`);
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1000);
      
      const rawDetails = await scrapeProductPage(page, url);
      
      // Select the best description line if multiple exist
      let desc = rawDetails.description || '';
      if (desc.includes('\n')) {
        const lines = desc.split('\n').map(l => l.trim()).filter(l => l.length > 25);
        const bestLine = lines.find(l => l.includes('Karmen') || l.includes('Koleksiyon') || l.includes('modeli')) || lines[0] || '';
        desc = bestLine;
      }
      
      const details = {
        description: cleanText(desc),
        specs: {},
        highlights: (rawDetails.highlights || []).map(cleanText).filter(h => h.length > 0),
        notes: cleanText(rawDetails.notes)
      };
      
      for (const [k, v] of Object.entries(rawDetails.specs || {})) {
        details.specs[cleanText(k)] = cleanText(v);
      }
      
      // Fallback: If description is still empty but we got specs, set a basic description
      if (!details.description && Object.keys(details.specs).length > 0) {
        const titleWords = pid.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1));
        const friendlyName = titleWords.join(' ');
        details.description = `Karmen Halı ${friendlyName} modeli, modern ve zarif tasarımıyla eviniz için şık bir atmosfer oluşturur.`;
      }
      
      if (details.description || Object.keys(details.specs).length > 0) {
        karmenDetails[pid] = details;
        successCount++;
        console.log(`   ✅ Başarılı!`);
        console.log(`      Açıklama: "${details.description.substring(0, 120)}..."`);
        console.log(`      Özellikler: ${Object.keys(details.specs).join(', ')}`);
      } else {
        failCount++;
        console.log(`   ⚠️ Detay çıkarılamadı (boş içerik)`);
      }
      
    } catch (err) {
      failCount++;
      console.error(`   ❌ Hata: ${err.message}`);
    }
    
    // Save incrementally
    if (successCount % 5 === 0) {
      fs.writeFileSync(DETAILS_FILE, JSON.stringify(karmenDetails, null, 2), 'utf-8');
    }
  }
  
  // Final save
  fs.writeFileSync(DETAILS_FILE, JSON.stringify(karmenDetails, null, 2), 'utf-8');
  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`🎉 Yeniden Çekim Tamamlandı!`);
  console.log(`   ✅ Başarıyla güncellenen: ${successCount}`);
  console.log(`   ❌ Başarısız: ${failCount}`);
  console.log(`   📄 Çıktı: ${DETAILS_FILE}`);
  console.log(`═══════════════════════════════════════════════════`);
  
  await browser.close();
}

run();
