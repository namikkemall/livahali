/**
 * scrape-karmen-sizes.js
 * ──────────────────────
 * Visits each Karmen product page on karmenhali.com and extracts
 * the available sizes from span.size_box elements.
 *
 * Merges the `sizes` array into the existing karmen-details.json.
 *
 * Usage:
 *   node scripts/scrape-karmen-sizes.js            # all products
 *   node scripts/scrape-karmen-sizes.js look-black  # single collection
 */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const BASE_URL = 'https://karmenhali.com';
const DETAILS_FILE = path.join(process.cwd(), 'src/data/karmen-details.json');

// ── Load existing karmen-details.json ──
let detailsData = {};
if (fs.existsSync(DETAILS_FILE)) {
  detailsData = JSON.parse(fs.readFileSync(DETAILS_FILE, 'utf-8'));
  console.log(`📂 Mevcut veri yüklendi: ${Object.keys(detailsData).length} ürün`);
}

// ── Load Karmen collections from .ts files ──
async function loadKarmenCollections() {
  const collectionsDir = path.join(process.cwd(), 'src/data/collections');
  const files = fs.readdirSync(collectionsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');
  const collections = [];

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

    if (productIds.length > 0) {
      collections.push({ slug: collectionSlug, productIds });
    }
  }
  return collections;
}

// ── Extract sizes from a product page ──
async function extractSizes(page) {
  return page.evaluate(() => {
    const sizeBoxes = document.querySelectorAll('span.size_box');
    const sizes = [];
    for (const box of sizeBoxes) {
      // Skip hidden ones
      if (box.style.display === 'none') continue;
      const title = box.getAttribute('title')?.trim();
      if (!title) continue;
      // Skip "Özel Ölçü" (custom size option)
      if (title.toLowerCase().includes('özel')) continue;
      sizes.push(title);
    }
    return sizes;
  });
}

// ── Find real product URL from collection page ──
async function discoverProductUrls(page, collectionSlug) {
  const productUrlMap = {};
  const tryUrls = [
    `${BASE_URL}/${collectionSlug}`,
    `${BASE_URL}/${collectionSlug}-hali-koleksiyonu`
  ];

  for (const tryUrl of tryUrls) {
    try {
      await page.goto(tryUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
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

      const pageUrls = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => (a.href || '').split('?')[0])
          .filter(href => href && /\-\d+$/.test(href));
      });

      if (pageUrls.length > 0) {
        for (const url of pageUrls) {
          const slug = url.split('/').pop().replace(/-\d+$/, '');
          productUrlMap[slug] = url;
        }
        break;
      }
    } catch { /* try next URL pattern */ }
  }
  return productUrlMap;
}

// ── Try direct URL with common suffixes ──
async function tryDirectUrls(page, productSlug) {
  for (const suffix of ['', '-7', '-6', '-5', '-4', '-3', '-2', '-1', '-8', '-9', '-10']) {
    const url = `${BASE_URL}/${productSlug}${suffix}`;
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      if (response && response.status() === 200) {
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

  console.log('📐 Karmen Halı ebat/boyut bilgisi scraper başlatılıyor...');
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
  let scraped = 0;
  let skipped = 0;
  let failed = 0;

  for (const collection of toProcess) {
    console.log(`\n══════════════════════════════════════════`);
    console.log(`📂 ${collection.slug.toUpperCase()} (${collection.productIds.length} ürün)`);
    console.log(`══════════════════════════════════════════`);

    let context = await browser.newContext();
    let discoveryPage = await context.newPage();

    // Discover product URLs from collection page
    const productUrlMap = await discoverProductUrls(discoveryPage, collection.slug);
    console.log(`   🔗 ${Object.keys(productUrlMap).length} ürün URL'si bulundu.`);
    await discoveryPage.close();

    for (const [idx, productId] of collection.productIds.entries()) {
      // Skip if already has sizes data
      if (detailsData[productId]?.sizes && detailsData[productId].sizes.length > 0) {
        console.log(`   ⏩ [${idx + 1}/${collection.productIds.length}] Zaten var: ${productId}`);
        skipped++;
        continue;
      }

      console.log(`   📐 [${idx + 1}/${collection.productIds.length}] ${productId}`);

      let productPage;
      try {
        productPage = await context.newPage();

        let realUrl = productUrlMap[productId];
        if (!realUrl) {
          realUrl = await tryDirectUrls(productPage, productId);
        }

        if (!realUrl) {
          console.log(`      ❌ URL bulunamadı, atlanıyor.`);
          failed++;
          continue;
        }

        await productPage.goto(realUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await productPage.waitForTimeout(2000);

        const sizes = await extractSizes(productPage);

        if (sizes.length > 0) {
          // Make sure the entry exists in detailsData
          if (!detailsData[productId]) {
            detailsData[productId] = { description: '', specs: {}, highlights: [], notes: '' };
          }
          detailsData[productId].sizes = sizes;
          scraped++;
          console.log(`      ✅ Ebatlar: ${sizes.join(', ')}`);
        } else {
          console.log(`      ⚠️ Ebat bilgisi bulunamadı.`);
          failed++;
        }

      } catch (err) {
        console.error(`      ❌ Hata: ${err.message}`);
        failed++;

        if (err.message.includes('closed') || err.message.includes('target')) {
          try { await context.close(); } catch {}
          context = await browser.newContext();
        }
      } finally {
        if (productPage) {
          try { await productPage.close(); } catch {}
        }
      }

      // Incremental save every 5 products
      if ((scraped + skipped) % 5 === 0) {
        fs.writeFileSync(DETAILS_FILE, JSON.stringify(detailsData, null, 2), 'utf-8');
      }
    }

    try { await context.close(); } catch {}
  }

  // Final save
  fs.writeFileSync(DETAILS_FILE, JSON.stringify(detailsData, null, 2), 'utf-8');
  await browser.close();

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`🎉 Tamamlandı!`);
  console.log(`   ✅ Yeni çekilen: ${scraped}`);
  console.log(`   ⏩ Zaten mevcut: ${skipped}`);
  console.log(`   ❌ Başarısız: ${failed}`);
  console.log(`   📄 Çıktı: ${DETAILS_FILE}`);
  console.log('═══════════════════════════════════════════════════');
}

main().catch(console.error);
