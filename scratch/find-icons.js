import * as cheerio from 'cheerio';

const BASE_URL = 'https://satentextile.com/tr';
const collections = ['armony', 'silva', 'effect', 'pixel', 'tiora', 'farah'];

async function run() {
  for (const slug of collections) {
    const url = `${BASE_URL}/${slug}`;
    console.log(`\n--- ${slug.toUpperCase()} ---`);
    try {
      const res = await fetch(url);
      const html = await res.text();
      const $ = cheerio.load(html);
      const border = $('div.border');
      
      console.log('Feature Icons (div.logolar img):');
      border.find('div.logolar img').each((_, el) => {
        console.log('  -', $(el).attr('src'), '| alt:', $(el).attr('alt'));
      });
      
      console.log('Finish Icons (div.sol img.icon):');
      border.find('div.sol img.icon').each((_, el) => {
        console.log('  -', $(el).attr('src'));
      });
    } catch (err) {
      console.error('Error:', err.message);
    }
  }
}

run();
