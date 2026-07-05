/**
 * scrape-karmen-details.js
 * ─────────────────────────
 * Visits each Karmen product page on karmenhali.com and extracts:
 *   - Product description paragraph
 *   - Specifications (Malzeme, Taban, Hav Yüksekliği, M2 Ağırlığı, Ek Özellikler)
 *   - "Neden" highlights
 *   - "Dikkat" notes
 *
 * URL strategy:
 *   The product `id` in our data is the slug without the trailing Ticimax
 *   numeric ID (e.g. "best-108-bej-hali-…-salon-halisi").
 *   The real URL has that slug + "-{number}" at the end.
 *   We search for the product on the collection page to find the real URL,
 *   OR we try common suffixes.
 *
 * Output:  src/data/karmen-details.json
 *   {
 *     "best-108-bej-…": {
 *       "description": "...",
 *       "specs": { "Malzeme": "...", ... },
 *       "highlights": ["...", ...],
 *       "notes": "..."
 *     }
 *   }
 *
 * Usage:
 *   node scripts/scrape-karmen-details.js            # all Karmen collections
 *   node scripts/scrape-karmen-details.js best        # single collection
 */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const BASE_URL = 'https://karmenhali.com';
const OUTPUT_FILE = path.join(process.cwd(), 'src/data/karmen-details.json');

// ── Load existing results to allow incremental scraping ──
let existingData = {};
if (fs.existsSync(OUTPUT_FILE)) {
  try {
    existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    console.log(`📂 Mevcut veri yüklendi: ${Object.keys(existingData).length} ürün`);
  } catch { /* start fresh */ }
}

// ── Dynamically import all Karmen collection modules ──
async function loadKarmenCollections() {
  const collectionsDir = path.join(process.cwd(), 'src/data/collections');
  const indexPath = path.join(collectionsDir, 'index.ts');
  
  // We can't import .ts directly — instead, read the TS files and extract
  // products from the JSON-like product arrays. But simpler: just glob the
  // collection TS files and parse the product IDs + collection slugs.
  
  // Actually, let's just read all .ts collection files and extract product IDs
  // by looking for the `"id": "..."` pattern. We also need to know which are
  // Karmen (brand: 'karmen').
  
  const collections = [];
  const files = fs.readdirSync(collectionsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(collectionsDir, file), 'utf-8');
    
    // Skip non-Karmen (Saten) collections
    if (!content.includes("brand: 'karmen'")) continue;
    // Skip meta/utility files
    if (content.includes('iletisim') || content.includes('teslimat') || content.includes('hali-koleksiyonlari')) continue;
    
    // Extract collection slug from the `id: "..."` line (first occurrence)
    const idMatch = content.match(/id:\s*"([^"]+)"/);
    if (!idMatch) continue;
    const collectionSlug = idMatch[1];
    
    // Extract all product IDs
    const productIds = [];
    const idRegex = /"id":\s*"([^"]+)"/g;
    let match;
    let isFirst = true;
    while ((match = idRegex.exec(content)) !== null) {
      if (isFirst) { isFirst = false; continue; } // skip collection-level id
      // Skip variant IDs (they contain -v1, -v2, etc.)
      if (/-v\d+$/.test(match[1])) continue;
      productIds.push(match[1]);
    }
    
    if (productIds.length > 0) {
      collections.push({ slug: collectionSlug, productIds });
    }
  }
  
  return collections;
}

// ── Extract product details from a Karmen product page ──
async function extractProductDetails(page) {
  return page.evaluate(() => {
    const result = {
      description: '',
      specs: {},
      highlights: [],
      notes: ''
    };
    
    // Check specific tab containers first to avoid large page wrappers
    const tabContainer = document.querySelector('.urunTabAlt') || document.querySelector('#divOzelTab');
    let targetText = '';
    
    if (tabContainer && tabContainer.textContent.length > 50) {
      targetText = tabContainer.textContent;
    } else {
      const divs = Array.from(document.querySelectorAll('div'));
      let minLen = Infinity;
      for (const d of divs) {
        const text = d.textContent || '';
        if ((text.includes('Ürün Açıklaması') || text.includes('Hav Yüksekliği') || text.includes('Malzeme')) && text.length < minLen && text.length > 50 && !text.includes('Benzer Ürünler') && !text.includes('Sepete Ekle') && !text.includes('Yorumlar(0)')) {
           minLen = text.length;
           targetText = text;
        }
      }
    }
    
    if (targetText) {
      const lines = targetText.split('\n').map(l => l.trim()).filter(l => l);
      let currentSection = 'desc';
      
      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        if (lowerLine === 'ürün açıklaması') { currentSection = 'desc'; continue; }
        if (lowerLine.includes('teknik bilgiler') || (lowerLine.includes('özellikler') && !lowerLine.includes('ek') && !lowerLine.includes('öne çıkan'))) { currentSection = 'specs'; continue; }
        if (lowerLine.includes('kullanım alanları') || lowerLine.includes('neden') || lowerLine.includes('öne çıkan') || lowerLine.includes('avantajlar')) { currentSection = 'highlights'; continue; }
        if (lowerLine.includes('dikkat') || lowerLine.includes('bilgilendirme')) { currentSection = 'notes'; continue; }
        if (lowerLine.includes('sık sorulan sorular')) { currentSection = ''; continue; } // Stop reading
        
        if (currentSection === 'desc') {
           if (!result.description) result.description = line; // get the first paragraph
           else if (result.description.length < 350) result.description += ' ' + line;
        }
        else if (currentSection === 'specs') {
           const parts = line.split(':');
           if (parts.length > 1) {
             result.specs[parts[0].trim()] = parts[1].trim();
           }
        }
        else if (currentSection === 'highlights') {
           if (!line.includes(':')) {
               result.highlights.push(line);
           } else {
               result.highlights.push(line.split(':')[1].trim() || line);
           }
        }
        else if (currentSection === 'notes') {
           if (!result.notes) result.notes = line;
           else result.notes += ' ' + line;
        }
      }
    }
    
    return result;
  });
}

// ── Find real product URL by searching the collection page ──
async function findProductUrl(page, collectionSlug, productSlug) {
  // Navigate to collection page first
  const collectionUrl = `${BASE_URL}/${collectionSlug}`;
  
  try {
    await page.goto(collectionUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    
    // Scroll to load lazy content
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let total = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, 200);
          total += 200;
          if (total >= document.body.scrollHeight) { clearInterval(timer); resolve(); }
        }, 30);
      });
    });
    await page.waitForTimeout(1000);
    
    // Find all product links and match by slug
    const urls = await page.evaluate((slug) => {
      const anchors = document.querySelectorAll('a');
      const matches = [];
      for (const a of anchors) {
        const href = a.href || '';
        if (href.includes(slug)) {
          matches.push(href.split('?')[0]);
        }
      }
      return [...new Set(matches)];
    }, productSlug);
    
    return urls[0] || null;
  } catch (err) {
    console.error(`   ⚠️ Koleksiyon sayfası yüklenemedi: ${err.message}`);
    return null;
  }
}

// ── Try direct URL with common suffixes ──
async function tryDirectUrls(page, productSlug) {
  // Try the slug directly (some pages don't have numeric suffix)
  for (const suffix of ['', '-7', '-6', '-5', '-4', '-3', '-2', '-1', '-8', '-9', '-10']) {
    const url = `${BASE_URL}/${productSlug}${suffix}`;
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      if (response && response.status() === 200) {
        // Check if this is actually a product page (not 404 or redirect to homepage)
        const title = await page.title();
        if (title && !title.includes('404') && !title.includes('Anasayfa') && !title.includes('Karmen Halı |')) {
          return url;
        }
      }
    } catch { /* try next */ }
  }
  return null;
}

async function main() {
  const targetCollection = process.argv[2]?.toLowerCase().trim();
  
  console.log('🔍 Karmen Halı ürün detayları scraper başlatılıyor...');
  console.log('═══════════════════════════════════════════════════\n');
  
  const collections = await loadKarmenCollections();
  
  let toProcess = collections;
  if (targetCollection) {
    toProcess = collections.filter(c => c.slug === targetCollection);
    if (toProcess.length === 0) {
      console.error(`❌ Koleksiyon bulunamadı: ${targetCollection}`);
      console.log('Mevcut Karmen koleksiyonları:', collections.map(c => c.slug).join(', '));
      process.exit(1);
    }
  }
  
  const totalProducts = toProcess.reduce((sum, c) => sum + c.productIds.length, 0);
  console.log(`📦 ${toProcess.length} koleksiyon, toplam ${totalProducts} ürün işlenecek.\n`);
  
  const browser = await chromium.launch({ headless: true });
  const results = { ...existingData };
  let scraped = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const collection of toProcess) {
    console.log(`\n══════════════════════════════════════════`);
    console.log(`📂 ${collection.slug.toUpperCase()} (${collection.productIds.length} ürün)`);
    console.log(`══════════════════════════════════════════`);
    
    // Use a fresh context per collection to avoid memory buildup
    let context = await browser.newContext();
    let collectionPage = await context.newPage();
    
    // First, navigate to collection page to discover real URLs
    const collectionUrl = `${BASE_URL}/${collection.slug}`;
    let productUrlMap = {};
    
    try {
      // Some collections have a different URL pattern
      const tryUrls = [
        collectionUrl,
        `${BASE_URL}/${collection.slug}-hali-koleksiyonu`
      ];
      
      for (const tryUrl of tryUrls) {
        try {
          await collectionPage.goto(tryUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await collectionPage.waitForTimeout(1500);
          
          // Scroll to load all products
          await collectionPage.evaluate(async () => {
            await new Promise(resolve => {
              let total = 0;
              const timer = setInterval(() => {
                window.scrollBy(0, 200);
                total += 200;
                if (total >= document.body.scrollHeight) { clearInterval(timer); resolve(); }
              }, 30);
            });
          });
          await collectionPage.waitForTimeout(1000);
          
          // Collect all product URLs from the page
          const pageUrls = await collectionPage.evaluate((slug) => {
            return Array.from(document.querySelectorAll('a'))
              .map(a => (a.href || '').split('?')[0])
              .filter(href => href && href.startsWith('https://karmenhali.com/') && href.includes(`/${slug}-`));
          }, collection.slug);
          
          if (pageUrls.length > 0) {
            console.log(`   🔗 Koleksiyon sayfasında ${pageUrls.length} ürün URL'si bulundu.`);
            for (const url of pageUrls) {
              // Extract the slug part (without trailing numeric id)
              const slug = url.split('/').pop().replace(/-\d+$/, '');
              productUrlMap[slug] = url;
            }
            break; // Found URLs, stop trying
          }
        } catch { /* try next URL */ }
      }
    } catch (err) {
      console.error(`   ⚠️ Koleksiyon keşfi hatası: ${err.message}`);
    }
    
    await collectionPage.close();
    
    for (const [idx, productId] of collection.productIds.entries()) {
      // Skip if already scraped (incremental)
      if (results[productId] && results[productId].description) {
        console.log(`   ⏩ [${idx + 1}/${collection.productIds.length}] Zaten var: ${productId}`);
        skipped++;
        continue;
      }
      
      console.log(`   🔍 [${idx + 1}/${collection.productIds.length}] ${productId}`);
      
      let productPage;
      try {
        productPage = await context.newPage();
        
        // Find the real URL
        let realUrl = productUrlMap[productId];
        
        if (!realUrl) {
          // Try direct URL with common numeric suffixes
          realUrl = await tryDirectUrls(productPage, productId);
        }
        
        if (!realUrl) {
          console.log(`      ❌ URL bulunamadı, atlanıyor.`);
          failed++;
          continue;
        }
        
        // Navigate to product page
        await productPage.goto(realUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await productPage.waitForTimeout(1500);
        
        // Extract details
        const details = await extractProductDetails(productPage);
        
        if (details.description || Object.keys(details.specs).length > 0) {
          results[productId] = details;
          scraped++;
          console.log(`      ✅ Açıklama: ${details.description.substring(0, 60)}...`);
          console.log(`      📋 Özellikler: ${Object.keys(details.specs).join(', ') || 'yok'}`);
        } else {
          console.log(`      ⚠️ İçerik çıkarılamadı.`);
          failed++;
        }
        
      } catch (err) {
        console.error(`      ❌ Hata: ${err.message}`);
        failed++;
        
        // Recreate context if crashed
        if (err.message.includes('closed') || err.message.includes('target')) {
          try { await context.close(); } catch {}
          context = await browser.newContext();
        }
      } finally {
        if (productPage) {
          try { await productPage.close(); } catch {}
        }
      }
      
      // Save incrementally every 10 products
      if ((scraped + skipped) % 10 === 0) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
      }
    }
    
    try { await context.close(); } catch {}
  }
  
  // Final save
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
  
  await browser.close();
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`🎉 Tamamlandı!`);
  console.log(`   ✅ Yeni çekilen: ${scraped}`);
  console.log(`   ⏩ Zaten mevcut: ${skipped}`);
  console.log(`   ❌ Başarısız: ${failed}`);
  console.log(`   📄 Çıktı: ${OUTPUT_FILE}`);
  console.log('═══════════════════════════════════════════════════');
}

main().catch(console.error);
