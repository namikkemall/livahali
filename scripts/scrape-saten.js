import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const BASE_URL = 'https://satentextile.com';
const OUTPUT_DIR = path.join(process.cwd(), 'src/data/collections');
const IMAGES_DIR = path.join(process.cwd(), 'public/images/products');

// Clean helper to download images
async function downloadImage(url, targetPath) {
  try {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch error: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(targetPath, buffer);
  } catch (error) {
    console.error(`   ❌ Görsel indirilemedi ${url}:`, error.message);
  }
}

async function scrapeCollection(browser, collectionSlug, pageUrl) {
  console.log(`\n==================================================`);
  console.log(`🚀 SERİ BAŞLADI (SATEN TEXTILE): ${collectionSlug.toUpperCase()}`);
  console.log(`🔗 Adres: ${pageUrl}`);
  console.log(`==================================================`);

  // --- SIFIR ÇÖP STRATEJİSİ ---
  // Koleksiyon klasörü varsa önce içindeki her şeyle birlikte tamamen siliniyor
  const collectionImagesDir = path.join(IMAGES_DIR, collectionSlug);
  if (fs.existsSync(collectionImagesDir)) {
    console.log(`🧹 Eski klasör ve hatalı dosyalar temizleniyor: ${collectionImagesDir}`);
    fs.rmSync(collectionImagesDir, { recursive: true, force: true });
  }
  // Tertemiz, sıfır kilometre klasör oluşturuluyor
  fs.mkdirSync(collectionImagesDir, { recursive: true });

  let context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 60000 });

    console.log('📜 Sayfa lazy-load görseller için yavaşça aşağı kaydırılıyor...');
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 150;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 25);
      });
    });
    await page.waitForTimeout(2000);

    console.log(`🔍 DOM yapısından halı kartları ve varyantları ayıklanıyor...`);
    const rawProducts = await page.evaluate(() => {
      const items = document.querySelectorAll('div.item');
      const results = [];

      items.forEach(item => {
        // Halı kodunu al (Örn: SC013S)
        const nameDiv = item.querySelector('.adi');
        if (!nameDiv) return;
        const productCode = nameDiv.innerText.trim();
        if (!productCode) return;

        // O halıya ait tüm fancybox resim linklerini topla
        const anchors = item.querySelectorAll('a[data-fancybox]');
        const imageUrls = [];
        
        anchors.forEach(a => {
          const href = a.getAttribute('href');
          if (href && !imageUrls.includes(href)) {
            imageUrls.push(href);
          }
        });

        if (imageUrls.length > 0) {
          results.push({
            code: productCode,
            images: imageUrls
          });
        }
      });

      return results;
    });

    console.log(`📦 Bu seride ${rawProducts.length} adet halı modeli bulundu.`);
    const productsArray = [];

    // Her bir halı modeli için döngüye giriyoruz
    for (const [pIdx, protoProduct] of rawProducts.entries()) {
      const productSlug = protoProduct.code.toLowerCase().replace(/[^a-z0-9-]/g, '');
      const finalName = protoProduct.code.toUpperCase();

      console.log(`\n🕵️‍♂️ [${pIdx + 1}/${rawProducts.length}] Model İşleniyor: ${finalName} (${protoProduct.images.length} Açı/Varyant)`);

      const variants = [];

      // Halının kendi içindeki 5-6 farklı açısının fotoğrafını indiriyoruz
      for (const [imgIdx, rawSrc] of protoProduct.images.entries()) {
        const absoluteImgUrl = rawSrc.startsWith('http') 
          ? rawSrc 
          : `${BASE_URL}/${rawSrc.replace(/^\//, '')}`;

        const ext = path.extname(absoluteImgUrl).split('?')[0] || '.jpg';
        
        // Klasör yapısı: public/images/products/scala/sc013s/sc013s_1.jpg
        const filename = `${productSlug}_${imgIdx + 1}${ext}`;
        const localSavePath = path.join(collectionImagesDir, productSlug, filename);
        const astroAssetPath = `/images/products/${collectionSlug}/${productSlug}/${filename}`;

        await downloadImage(absoluteImgUrl, localSavePath);

        variants.push({
          id: `${productSlug}-v${imgIdx + 1}`,
          colorName: `Açı ${imgIdx + 1}`,
          colorHex: '#7F8C8D',
          imagePath: astroAssetPath
        });
      }

      if (variants.length > 0) {
        productsArray.push({
          id: productSlug,
          name: finalName,
          description: `${finalName} premium collection carpet model.`,
          tags: ["Premium Seri", "Saten Textile"],
          variants: variants
        });
      }
    }

    if (productsArray.length > 0) {
      const fileContent = `import type { Category } from "../catalog";

export const ${collectionSlug.replace(/[^a-zA-Z0-9]/g, '')}Collection: Category = {
  id: "${collectionSlug}",
  title: "${collectionSlug.toUpperCase().replace(/-/g, ' ')} Serisi",
  description: "Saten Textile premium catalog items extracted automatically.",
  products: ${JSON.stringify(productsArray, null, 2)}
};`;

      if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      fs.writeFileSync(path.join(OUTPUT_DIR, `${collectionSlug}.ts`), fileContent);
      console.log(`\n✅ TS DOSYASI YAZILDI: src/data/collections/${collectionSlug}.ts`);
    }

  } catch (error) {
    console.error(`❌ Koleksiyon hatası (${collectionSlug}):`, error.message);
  } finally {
    try { await page.close(); } catch {}
    try { await context.close(); } catch {}
  }
}

async function runPipeline() {
  const targetArg = process.argv[2]; 
  console.log('🤖 Saten Textile için kazıma canavarı başlatılıyor...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const HUB_URL = 'https://satentextile.com/tr/koleksiyonlar';
    console.log(`🌐 Koleksiyon listesi çekiliyor: ${HUB_URL}`);
    await page.goto(HUB_URL, { waitUntil: 'networkidle' });

    const allLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href') || '');
    });

    const discoveredCollections = [];
    const seenSlugs = new Set();

    for (let href of allLinks) {
      if (!href) continue;
      
      // 🔥 KRİTİK DÜZELTME: Eğer link tam URL ise (https://...) domain kısmını temizleyip bağıl (relative) hale getiriyoruz
      let relativeHref = href
        .replace('https://satentextile.com', '')
        .replace('http://satentextile.com', '')
        .replace('https://www.satentextile.com', '')
        .replace('http://www.satentextile.com', '');

      // Artık her halükarda elimizde "/tr/..." ile başlayan veya başlamayan temiz bir yol var
      if (!relativeHref.startsWith('/tr/')) continue;

      const cleanSlug = relativeHref.replace('/tr/', '').replace(/\/$/, '').toLowerCase().trim();

      // Statik/Gereksiz sayfaları filtrele
      const utilityAndFilters = [
        'koleksiyonlar', 'iletisim', 'hakkimizda', 'kurumsal', 'giris', 'kayit', 'hesabim',
        'blog', 'anasayfa', 'kvkk', 'cerez-politikasi', 'gizlilik-politikasi'
      ];
      if (utilityAndFilters.includes(cleanSlug) || cleanSlug.includes('/') || !cleanSlug) continue;
      if (seenSlugs.has(cleanSlug)) continue;

      seenSlugs.add(cleanSlug);
      discoveredCollections.push({
        slug: cleanSlug,
        url: `${BASE_URL}/tr/${cleanSlug}`
      });
    }

    await page.close();
    await context.close();

    // Tek bir kategori çalıştırmak istersen destekler: npm run scrape-saten -- scala
    let collectionsToProcess = discoveredCollections;
    if (targetArg) {
      const cleanTargetArg = targetArg.toLowerCase().trim();
      collectionsToProcess = discoveredCollections.filter(item => item.slug === cleanTargetArg);
      if (collectionsToProcess.length === 0) {
        console.log(`⚠️ Belirtilen koleksiyon (${cleanTargetArg}) listede bulunamadı. Doğrudan gidiliyor...`);
        collectionsToProcess = [{
          slug: cleanTargetArg,
          url: `${BASE_URL}/tr/${cleanTargetArg}`
        }];
      }
    }

    console.log(`\n🎯 Toplam ${collectionsToProcess.length} adet koleksiyon sıraya eklendi.`);

    for (const item of collectionsToProcess) {
      await scrapeCollection(browser, item.slug, item.url);
    }

    console.log('\n🎉 Operasyon başarıyla tamamlandı! Veriler pırıl pırıl indirildi.');

  } catch (error) {
    console.error('❌ Ana pipeline hatası:', error.message);
  } finally {
    try { await browser.close(); } catch {}
  }
}

runPipeline();