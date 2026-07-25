import {readFile} from 'node:fs/promises';

const details = JSON.parse(await readFile(new URL('../../src/data/legacy-details.json', import.meta.url), 'utf8'));
const fallbackPages = {
  'clive-christian-strange-heavens-out-of-the-blue': 'https://www.lessenteurs.com/products/out-of-the-blue',
  'lorenzo-pazzaglia-sun-gria': 'https://www.venbafragrance.com/products/lorenzo-pazzaglia-sun-gria-extrait',
  'versace-atelier-ambre-nectar': 'https://www.douglas.de/de/p/5011739135',
  'hfc-nirvanesque': 'https://makeup.it/product/845613/',
  'tom-ford-eau-d-ombre-leather': 'https://www.nocibe.fr/fr/p/5011532012',
  'penhaligon-s-the-dandy': 'https://www.perfumedirect.com/products/penhaligons-the-dandy-eau-de-parfum-unisex-fragrance-spray-30ml-100ml',
  'louis-vuitton-ambre-levant': 'https://www.crepslocker.com/products/louis-vuitton-ambre-levant-eau-de-parfum',
  'jean-paul-gaultier-divine-le-parfum': 'https://thebeautyshop.com.au/products/gaultier-devine-le-parfum-edp-intense',
  'maison-francis-kurkdjian-cologne-forte': 'https://shop.campomarzio70.it/en/products/maison-francis-kurkdjian-aqua-universalis-cologne-forte',
  'kilian-her-majesty': 'https://www.cultbeauty.com/p/kilian-her-majesty-eau-de-parfum-50ml/17604057/',
  'hfc-wear-love-everywhere': 'https://parfumexquis.com/products/wear-love-everywhere',
  'memo-paris-russian-leather': 'https://www.harrods.com/en-gb/p/memo-paris-russian-leather-eau-de-parfum-75ml-000000000007703083',
  'memo-paris-sintra': 'https://laparfumeriebordelaise.com/en/products/memo-paris-memo-sintra-edp',
  'memo-paris-marfa': 'https://www.mozerr.com/memo-paris-marfa-edp-75-ml-unisex-parfum',
};
const pending = Object.entries(details)
  .filter(([, value]) => /^\/products\/\d+\.jpg$/.test(value.imageUrl));
const output = [];

for (const [slug, value] of pending) {
  try {
    const pageUrl = fallbackPages[slug] ?? value.sourceUrl;
    const response = await fetch(pageUrl, {
      redirect: 'follow',
      headers: {'user-agent': 'Mozilla/5.0'},
    });
    const html = await response.text();
    const tags = html.match(/<meta\s+[^>]*>/gi) ?? [];
    const tag = tags.find((candidate) => /(?:property|name)=["'](?:og:image|twitter:image)["']/i.test(candidate));
    const image = tag?.match(/content=["']([^"']+)/i)?.[1] ?? null;
    output.push({slug, status: response.status, finalUrl: response.url, image});
  } catch (error) {
    output.push({slug, error: String(error)});
  }
}

console.log(JSON.stringify(output, null, 2));
