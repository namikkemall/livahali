/**
 * enrich-saten.js — Saten Tekstil Koleksiyon Zenginleştirici
 * ─────────────────────────────────────────────────────────────
 * Bu script mevcut scrape-saten.js'den BAĞIMSIZ çalışır.
 * scrape-saten.js halıların fotoğraflarını çeker.
 * Bu script ise her koleksiyonun satentextile.com sayfasından
 * gerçek ürün bilgilerini (ebatlar, özellikler, bitişler) çekip
 * mevcut src/data/collections/*.ts dosyalarını günceller.
 *
 * Çekilen veriler:
 *   - Ebatlar      → description alanına yazılır
 *                    Örn: "78x150 / 78x300 / 97x200 / 116x180 / 156x230 / 195x290"
 *   - Özellikler   → tags dizisine eklenir
 *                    Örn: ["Anti Alerjik", "Tozu Yok", "Pamuk Taban"]
 *   - Bitişler     → tags dizisine eklenir
 *                    Örn: ["Daire", "Oval", "Overlok", "Spor Saçak"]
 *   - Rulo Kesim   → varsa tags'e "Rulo Kesim" eklenir
 *
 * Kullanım:
 *   node scripts/enrich-saten.js           → tüm koleksiyonları zenginleştirir
 *   node scripts/enrich-saten.js silva     → sadece silva koleksiyonunu
 *   node scripts/enrich-saten.js --dry-run → dosya yazmadan çıktıyı gösterir
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://satentextile.com/tr';
const COLLECTIONS_DIR = path.join(process.cwd(), 'src/data/collections');

// Saten koleksiyonlarının slug → TS dosya adı eşleşmesi
// (bazılarının site slug'ı ile TS dosya adı farklı olabilir)
const SATEN_COLLECTIONS = [
  { slug: 'armada',      file: 'armada' },
  { slug: 'armony',      file: 'armony' },
  { slug: 'crown',       file: 'crown' },
  { slug: 'effect',      file: 'effect' },
  { slug: 'farah',       file: 'farah' },
  { slug: 'feel',        file: 'feel' },
  { slug: 'fesane',      file: 'fesane' },
  { slug: 'loya',        file: 'loya' },
  { slug: 'marvel',      file: 'marvel' },
  { slug: 'moon',        file: 'moon' },
  { slug: 'nexus',       file: 'nexus' },
  { slug: 'ottowa',      file: 'ottowa' },
  { slug: 'pixel',       file: 'pixel' },
  { slug: 'porto',       file: 'porto' },
  { slug: 'quatro',      file: 'quatro' },
  { slug: 'saten-sisal', file: 'saten-sisal' },
  { slug: 'scala',       file: 'scala' },
  { slug: 'silva',       file: 'silva' },
  { slug: 'solos',       file: 'solos' },
  { slug: 'step',        file: 'step' },
  { slug: 'tablo',       file: 'tablo' },
  { slug: 'tiora',       file: 'tiora' },
  { slug: 'vista',       file: 'vista' },
  { slug: 'wonder',      file: 'wonder' },
];

// ─────────────────────────────────────────────────────────────
// Yardımcı: dosya src'sinden ikon adını çıkarır
// "/icontr/Spor%20Sa%C3%A7ak.png" → "Spor Saçak"
// ─────────────────────────────────────────────────────────────
function iconNameFromSrc(src) {
  try {
    const filename = src.split('/').pop();                 // "Spor%20Sa%C3%A7ak.png"
    const decoded  = decodeURIComponent(filename);         // "Spor Saçak.png"
    return decoded.replace(/\.png$/i, '').trim();          // "Spor Saçak"
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Asıl veri çekme fonksiyonu
// ─────────────────────────────────────────────────────────────
async function fetchCollectionSpecs(slug) {
  const url = `${BASE_URL}/${slug}`;

  let html;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LivaHali-Scraper/1.0)',
        'Accept-Language': 'tr,en;q=0.9',
        'Accept-Charset': 'utf-8',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Force UTF-8 decode explicitly
    const buffer = await res.arrayBuffer();
    html = new TextDecoder('utf-8').decode(buffer);
  } catch (err) {
    console.error(`  ❌ Fetch hatası (${slug}): ${err.message}`);
    return null;
  }

  const $ = cheerio.load(html);
  const border = $('div.border');

  if (!border.length) {
    console.warn(`  ⚠️  .border bloğu bulunamadı: ${url}`);
    return null;
  }

  // ── 1. Ebatlar ──────────────────────────────────────────────
  // .aciklama.text-center içindeki text node (.kisaaciklama'dan önce)
  const aciklama = border.find('div.aciklama.text-center');

  // Sadece doğrudan text node'larını al (alt elemanları değil)
  let sizesText = '';
  aciklama.contents().each((_, node) => {
    if (node.type === 'text') {
      const t = $(node).text().trim();
      if (t) sizesText += t + ' ';
    }
  });
  sizesText = sizesText.trim();

  // ── 2. Rulo Kesim notu ────────────────────────────────────────
  const hasRuloKesim = aciklama.find('.kisaaciklama').text().toLowerCase().includes('rulo');

  // ── 3. Özellik ikonları (Anti Alerjik, Tozu Yok vb.) ─────────
  const featureTags = [];
  border.find('div.logolar img').each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt && alt.trim()) featureTags.push(alt.trim());
  });

  // ── 4. Bitiş ikonları (Daire, Oval, Overlok vb.) ─────────────
  const finishTags = [];
  border.find('div.sol img.icon').each((_, el) => {
    const src = $(el).attr('src') || '';
    const name = iconNameFromSrc(src);
    if (name) finishTags.push(name);
  });

  return {
    description: sizesText || null,
    hasRuloKesim,
    featureTags,
    finishTags,
  };
}

// ─────────────────────────────────────────────────────────────
// TS dosyasını günceller: description + tags alanlarını değiştirir
// ─────────────────────────────────────────────────────────────
function patchTsFile(filePath, specs, dryRun) {
  const original = fs.readFileSync(filePath, 'utf-8');

  // Yeni tags dizisi oluştur
  const allTags = [
    ...specs.featureTags,
    ...specs.finishTags,
    ...(specs.hasRuloKesim ? ['Rulo Kesim'] : []),
    'Saten Tekstil',
  ];

  // tags alanını değiştir
  // Mevcut satırı bul: tags: ["...", "..."],
  // Çok satırlı formatı da destekle
  const tagsReplacement = `tags: [${allTags.map(t => `"${t}"`).join(', ')}]`;

  let patched = original;

  // ── description (collection-level, products içindekiler değil) ──
  // Sadece products bloğundan önceki description'ı değiştir
  if (specs.description) {
    const prodMatchDesc = patched.match(/"?products"?\s*:/);
    const productsIdx = prodMatchDesc ? prodMatchDesc.index : -1;
    const beforeProds = productsIdx !== -1 ? patched.substring(0, productsIdx) : patched;
    const afterProds  = productsIdx !== -1 ? patched.substring(productsIdx) : '';

    const descRegex = /description:\s*"[^"]*"/;
    if (descRegex.test(beforeProds)) {
      patched = beforeProds.replace(descRegex, `description: "${specs.description}"`) + afterProds;
    }
  }

  // ── Per-product tags & descriptions (products array içindeki her ürün) ──
  // products bloğunu bul ve içindeki tüm "tags": [...] veya tags: [...] bloklarını değiştir
  const productsMatch = patched.match(/"?products"?\s*:/);
  if (productsMatch) {
    const productsStart = productsMatch.index;
    const beforeProds = patched.substring(0, productsStart);
    let productsSection = patched.substring(productsStart);

    // Hem "tags": [...] hem de tags: [...] çok satırlı bloklarını değiştir (product-level)
    const prodTagsRegex = /"?tags"?\s*:\s*\[[\s\S]*?\]/g;
    productsSection = productsSection.replace(prodTagsRegex, tagsReplacement);

    // Tüm product-level "description" veya description placeholder'larını temizle
    // Pattern: description: "XXXXX premium collection carpet model." veya "description": "..."
    productsSection = productsSection.replace(
      /"?description"?\s*:\s*"[^"]*premium collection carpet model\."/g,
      `description: ""`
    );

    patched = beforeProds + productsSection;
  }

  if (dryRun) {
    console.log('\n  📄 DRY-RUN — Dosya DEĞİŞTİRİLMEDİ. Yeni değerler:');
    console.log(`     description: "${specs.description}"`);
    console.log(`     tags: [${allTags.map(t => `"${t}"`).join(', ')}]`);
    return;
  }

  if (patched === original) {
    console.log('  ℹ️  Değişiklik yok (zaten güncel olabilir).');
    return;
  }

  fs.writeFileSync(filePath, patched, 'utf-8');
  console.log(`  ✅ Dosya güncellendi.`);
}

// ─────────────────────────────────────────────────────────────
// Ana pipeline
// ─────────────────────────────────────────────────────────────
async function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const targetSlug = args.find(a => !a.startsWith('--'));

  if (dryRun) console.log('🔍 DRY-RUN modu — dosyalar değiştirilmeyecek.\n');

  let collections = SATEN_COLLECTIONS;
  if (targetSlug) {
    collections = SATEN_COLLECTIONS.filter(c => c.slug === targetSlug || c.file === targetSlug);
    if (!collections.length) {
      console.error(`❌ Koleksiyon bulunamadı: "${targetSlug}"`);
      console.log('Kullanılabilir sluglar:', SATEN_COLLECTIONS.map(c => c.slug).join(', '));
      process.exit(1);
    }
  }

  console.log(`🚀 ${collections.length} koleksiyon zenginleştirilecek...\n`);

  let success = 0;
  let skipped = 0;
  let failed  = 0;

  for (const col of collections) {
    console.log(`─── ${col.slug.toUpperCase()} ───────────────────────────────`);

    const tsPath = path.join(COLLECTIONS_DIR, `${col.file}.ts`);
    if (!fs.existsSync(tsPath)) {
      console.warn(`  ⚠️  TS dosyası yok: ${tsPath} — atlanıyor.`);
      skipped++;
      continue;
    }

    // Rate limit: çok hızlı istek atmamak için kısa bekleme
    await new Promise(r => setTimeout(r, 400));

    const specs = await fetchCollectionSpecs(col.slug);
    if (!specs) {
      failed++;
      continue;
    }

    console.log(`  📐 Ebatlar : ${specs.description || '(bulunamadı)'}`);
    console.log(`  ✨ Özellik : ${specs.featureTags.join(', ') || '(yok)'}`);
    console.log(`  🔲 Bitiş   : ${specs.finishTags.join(', ') || '(yok)'}`);
    console.log(`  ✂️  Rulo   : ${specs.hasRuloKesim ? 'Evet' : 'Hayır'}`);

    patchTsFile(tsPath, specs, dryRun);
    success++;
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ Başarılı : ${success}`);
  console.log(`⏭️  Atlandı : ${skipped}`);
  console.log(`❌ Hatalı   : ${failed}`);
  if (dryRun) console.log('ℹ️  DRY-RUN — hiçbir dosya değiştirilmedi.');
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
