import * as cheerio from 'cheerio';

async function run() {
  const res = await fetch('https://satentextile.com/tr/armony');
  const html = await res.text();
  const $ = cheerio.load(html);
  console.log($('div.border').html());
}

run();
