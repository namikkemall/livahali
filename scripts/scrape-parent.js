import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const BASE_URL = 'https://karmenhali.com/';
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

// Robust product slug and ID extraction
function getProductSlug(url) {
  // Remove query parameters and trailing slashes
  let cleanUrl = url.split('?')[0].replace(/\/+$/, '');
  
  // Remove common Turkish/Ticimax route suffixes
  cleanUrl = cleanUrl
    .replace(/\/(ürün-incele|urun-incele)$/i, '')
    .replace(/\/(ürün-detay|urun-detay)$/i, '');
    
  const parts = cleanUrl.split('/');
  let slugSegment = parts[parts.length - 1] || '';
  
  // Strip trailing Ticimax internal numeric ID (e.g. -892, -4235)
  slugSegment = slugSegment.replace(/\-\d+$/, '');
  
  return slugSegment.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

async function scrapeCollection(browser, collectionSlug, pageUrl) {
  console.log(`\n==================================================`);
  console.log(`🚀 SERİ BAŞLADI: ${collectionSlug.toUpperCase()}`);
  console.log(`🔗 Adres: ${pageUrl}`);
  console.log(`==================================================`);

  let context = await browser.newContext();


  const page = await context.newPage();

  try {
    await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 60000 });

    console.log('📜 Sayfa yavaşça aşağı kaydırılıyor...');
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 120;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 30);
      });
    });
    await page.waitForTimeout(2000);

    console.log(`🔍 Ürün URL'leri ayıklanıyor...`);
    const productsData = await page.evaluate((slug) => {
      const results = [];
      const allAnchors = document.querySelectorAll('a');
      const firstWord = slug.split('-')[0]; // e.g., imperial-luxe -> imperial

      allAnchors.forEach(a => {
        const href = a.href || '';
        const cleanHref = href.split('?')[0];

        // Capture links containing the slug/first-word and ending in a number (or ending in urun-incele) or product code
        const baseUrl = 'https://karmenhali.com';
        const isProductUrl = cleanHref.startsWith(baseUrl) && 
                             cleanHref !== `${baseUrl}/${slug}` && 
                             cleanHref !== `${baseUrl}/${slug}/` && 
                             (cleanHref.includes(`/${slug}-`) || cleanHref.includes(`/${firstWord}-`));

        if (isProductUrl) {
          let name = a.innerText.trim();
          if (!name || /incele|urun|sepet|detay/i.test(name) || name.length < 4) {
            name = a.getAttribute('title')?.trim() || '';
          }
          results.push({ name, url: cleanHref });
        }
      });

      // Deduplicate by URL
      return Array.from(new Map(results.map(item => [item.url, item])).values());
    }, collectionSlug);

    console.log(`📦 Bu seride ${productsData.length} adet ürün bulundu.`);

    const productsArray = [];

    for (const [index, protoProduct] of productsData.entries()) {
      const productSlug = getProductSlug(protoProduct.url);

      if (!productSlug || productSlug === 'rn-incele') {
        console.log(`⚠️ Hatalı slug atlanıyor: ${protoProduct.url}`);
        continue;
      }

      // Generate a clean product name directly from the slug to guarantee accuracy and bypass any Turkish case-folding / generic text issues
      const finalName = productSlug.replace(/-/g, ' ').toUpperCase();

      console.log(`\n🕵️‍♂️ [${index + 1}/${productsData.length}] Ürün Detayına Gidiliyor: ${finalName}`);
      
      let detailPage;
      try {
        detailPage = await context.newPage();
        await detailPage.goto(protoProduct.url, { waitUntil: 'networkidle', timeout: 35000 });
        
        // Extract multiple variant images cleanly
        const variantImages = await detailPage.evaluate(() => {
          const thumbs = document.querySelectorAll('#divProductGalleryThumb .thumb-item img');
          if (thumbs.length > 0) {
            return Array.from(thumbs).map((img, vIdx) => {
              const rawSrc = img.getAttribute('data-src') || 
                             img.getAttribute('data-lazy') || 
                             img.getAttribute('src') || 
                             img.getAttribute('data-original') || '';
              const altText = img.getAttribute('alt')?.trim() || '';
              return { rawSrc, altText, vIdx };
            });
          }
          
          // Fallback to main images if thumbs don't exist
          const mainImgs = document.querySelectorAll('#imgUrunResim, .wm-zoom-default-img, #main-product-img');
          return Array.from(mainImgs).map((img, vIdx) => {
            const rawSrc = img.getAttribute('data-src') || 
                           img.getAttribute('src') || 
                           img.getAttribute('data-lazy') || 
                           img.getAttribute('data-original') || '';
            const altText = img.getAttribute('alt')?.trim() || '';
            return { rawSrc, altText, vIdx };
          });
        });

        const variants = [];

        for (const imgInfo of variantImages) {
          if (!imgInfo.rawSrc || imgInfo.rawSrc.includes('placeholder') || imgInfo.rawSrc.startsWith('data:image')) continue;

          const absoluteImgUrl = imgInfo.rawSrc.startsWith('http') 
            ? imgInfo.rawSrc 
            : `${BASE_URL.replace(/\/$/, '')}/${imgInfo.rawSrc.replace(/^\//, '')}`;

          const ext = path.extname(absoluteImgUrl).split('?')[0] || '.jpg';
          
          // Unique image filenames using index (e.g., look-black-lb001w_1.jpg)
          const filename = `${productSlug}_${imgInfo.vIdx + 1}${ext}`;

          const localSavePath = path.join(IMAGES_DIR, collectionSlug, productSlug, filename);
          const astroAssetPath = `/images/products/${collectionSlug}/${productSlug}/${filename}`;

          console.log(`   📸 Görsel İndiriliyor: ${absoluteImgUrl} -> ${astroAssetPath}`);
          await downloadImage(absoluteImgUrl, localSavePath);

          // Premium dynamic swatches labeling
          variants.push({
            id: `${productSlug}-v${imgInfo.vIdx + 1}`,
            colorName: `Görsel ${imgInfo.vIdx + 1}`,
            colorHex: '#7F8C8D',
            imagePath: astroAssetPath
          });
        }

        if (variants.length > 0) {
          productsArray.push({
            id: productSlug,
            name: finalName,
            description: `${finalName} premium carpet model.`,
            tags: ["%100 Akrilik", "Kolay Temizlenir"],
            variants: variants
          });
        }

      } catch (err) {
        console.error(`❌ Ürün detayı çekilemedi (${finalName}):`, err.message);
        
        // If context closed due to browser issues, recreate context safely
        if (err.message.includes('closed') || err.message.includes('target')) {
          try {
            await context.close();
          } catch {}
          context = await browser.newContext();
        }
      } finally {
        if (detailPage) {
          try {
            await detailPage.close();
          } catch {}
        }
      }
    }

    if (productsArray.length > 0) {
      const fileContent = `import type { Category } from "../catalog";

export const ${collectionSlug.replace(/[^a-zA-Z0-9]/g, '')}Collection: Category = {
  id: "${collectionSlug}",
  title: "${collectionSlug.toUpperCase().replace(/-/g, ' ')} Serisi",
  description: "Premium catalog items extracted automatically.",
  products: ${JSON.stringify(productsArray, null, 2)}
};`;

      if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      fs.writeFileSync(path.join(OUTPUT_DIR, `${collectionSlug}.ts`), fileContent);
      console.log(`\n✅ TS DOSYASI YAZILDI: src/data/collections/${collectionSlug}.ts`);
    }

  } catch (error) {
    console.error(`❌ Koleksiyon hatası (${collectionSlug}):`, error.message);
  } finally {
    try {
      await page.close();
    } catch {}
    try {
      await context.close();
    } catch {}
  }
}

async function runPipeline() {
  const targetArg = process.argv[2]; // Target category filtering support!
  console.log('🤖 Kazıma canavarı optimize modda başlatılıyor...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const HUB_URL = 'https://karmenhali.com/hali-koleksiyonlari';
    console.log(`🌐 Koleksiyon listesi çekiliyor: ${HUB_URL}`);
    await page.goto(HUB_URL, { waitUntil: 'networkidle' });

    const allLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href') || '');
    });

    const discoveredCollections = [];
    const seenSlugs = new Set();

    for (let href of allLinks) {
      if (!href) continue;
      href = href.replace('https://karmenhali.com', '').split('?')[0];
      if (href.startsWith('http') || href.startsWith('//') || href.startsWith('javascript:') || href.startsWith('#')) continue;

      const cleanPath = href.replace(/^\//, '').replace(/\/$/, '');
      if (!cleanPath || cleanPath.includes('/')) continue;

      const cleanSlug = cleanPath
        .replace('-hali-koleksiyonu', '')
        .replace('-koleksiyonu', '')
        .replace('-serisi', '')
        .replace('-hali', '')
        .toLowerCase()
        .trim();

      if (/\-\d+$/.test(cleanSlug)) continue;

      const utilityAndFilters = [
        'sepet', 'iletisim', 'hakkimizda', 'kurumsal', 'giris', 'kayit', 'hesabim',
        'hali-koleksiyonlari', 'blog', 'anasayfa', 'kvkk', 'uyelik', 'siparis', 'yardim',
        'odeme', 'kargo', 'magazalarimiz', 'tum-urunler', 'basinda-biz', 'faydali-bilgiler',
        'belgeler', 'kullanim-talimatlari', 'iptal-iade-kosullari', 'guvenlik-gizlilik-politikasi',
        'mesafeli-satis-sozlesmesi', 'bilgi-guvenligi-politikamiz', 'renkler', 'tarzlar', 'odalar',
        'cok-satanlar', 'yeni-urunleri', 'ozel-olcu', 'outlet-cesitleri'
      ];
      if (utilityAndFilters.includes(cleanSlug)) continue;
      if (cleanSlug.endsWith('lar') || cleanSlug.endsWith('ler') || cleanSlug.endsWith('si')) continue;
      
      if (seenSlugs.has(cleanSlug)) continue;

      seenSlugs.add(cleanSlug);
      discoveredCollections.push({
        slug: cleanSlug,
        url: `${BASE_URL}${cleanPath}`
      });
    }

    await page.close();
    await context.close();

    // Handle single category override
    let collectionsToProcess = discoveredCollections;
    if (targetArg) {
      const cleanTargetArg = targetArg.toLowerCase().trim();
      collectionsToProcess = discoveredCollections.filter(item => item.slug === cleanTargetArg);
      if (collectionsToProcess.length === 0) {
        console.log(`⚠️ Belirtilen koleksiyon (${cleanTargetArg}) listede bulunamadı. Hub harici doğrudan gidiliyor...`);
        collectionsToProcess = [{
          slug: cleanTargetArg,
          url: `${BASE_URL}${cleanTargetArg}`
        }];
      }
    }

    console.log(`\n🎯 Toplam ${collectionsToProcess.length} adet koleksiyon sıraya eklendi.`);

    for (const item of collectionsToProcess) {
      await scrapeCollection(browser, item.slug, item.url);
    }

    console.log('\n🎉 Operasyon başarıyla tamamlandı! Veriler tertemiz indirildi.');

  } catch (error) {
    console.error('❌ Ana pipeline hatası:', error.message);
  } finally {
    try {
      await browser.close();
    } catch {}
  }
}

runPipeline();