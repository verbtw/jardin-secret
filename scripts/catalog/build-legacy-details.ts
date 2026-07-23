import {readFile, writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import productsJson from '../../src/data/products.json' with {type: 'json'};
import type {Product} from '../../src/types/product.js';
import {loadPublicCatalog} from '../../src/data/catalog-service.js';
import {mergeCatalogProducts} from '../../src/data/merge-catalog.js';
import {
  buildArchiveImageUrl,
  loadArchiveEntries,
  parseOpenPerfumeCsv,
} from './open-perfume-dataset.js';

const DATASET_PATH = process.env.OPEN_PERFUME_DATASET_PATH ?? '/tmp/jardin-perfumes.csv';
const DATASET_SOURCE = 'https://huggingface.co/datasets/doevent/perfume';
const IMAGE_BASE_URL = 'https://jardin-secret-phi.vercel.app/api/perfume-image';
const OUTPUT_PATH = new URL('../../src/data/legacy-details.json', import.meta.url);

interface DetailsProfile {
  name?: string;
  volumeMl?: number;
  description: string;
  fragranceFamily: string;
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  keyNotes: string[];
  accords: string[];
  perfumers: string[];
  launchYear: number | null;
  imageUrl: string;
  sourceUrl: string;
}

interface ManualProfile {
  name?: string;
  volumeMl?: number;
  family: string;
  top?: string[];
  heart?: string[];
  base?: string[];
  key?: string[];
  accords?: string[];
  perfumers?: string[];
  year?: number;
  sourceUrl: string;
  imageUrl?: string;
  imageArchiveName?: string;
  description?: string;
}

const datasetAliases: Record<string, {brand: string; name: string; correctedName?: string; volumeMl?: number; year?: number; sourceUrl?: string}> = {
  'frederic-malle-promise-by-dominique-ropion': {brand: 'Frederic Malle', name: 'Promise', correctedName: 'Promise'},
  'chanel-bleu-de-chanel': {brand: 'Chanel', name: 'Bleu De Chanel Eau De Parfum', correctedName: 'Bleu de Chanel Eau de Parfum'},
  'clive-christian-blonde-amber': {brand: 'Clive Christian', name: 'Noble Xxi Art Deco Blonde Amber'},
  'kilian-apple-brandy': {brand: 'Kilian', name: 'Apple Brandy : New York'},
  'maison-crivelli-ambre-chromatique': {brand: 'Maison Crivelli', name: 'Ambre Chromatique'},
  'kilian-vodka-on-the-rocks': {brand: 'Kilian', name: 'Vodka On The Rocks : Moscow', correctedName: 'Vodka on the Rocks'},
  'dior-la-collection-privee': {brand: 'Dior', name: 'Purple Oud', correctedName: 'Purple Oud'},
  'creed-aventus-absolu': {brand: 'Creed', name: 'Aventus Absolu 2023', correctedName: 'Absolu Aventus'},
  'kilian-angels-share-eau-de-parfum': {brand: 'Kilian', name: "Angel'S Share", correctedName: "Angels' Share Eau de Parfum"},
  'clive-christian-cashmere-musk': {brand: 'Clive Christian', name: 'E Cashmere Musk'},
  'initio-parfums-prives-rehab': {brand: 'Initio Parfums Privé', name: 'Rehab'},
  'kilian-blue-moon': {brand: 'Kilian', name: 'Blue Moon Ginger Dash 2023', correctedName: 'Blue Moon Ginger Dash'},
  'parfums-de-marly-athalia': {brand: 'Parfums de Marly', name: 'Athalia'},
  'tom-ford-ombre-leather-parfum': {brand: 'Tom Ford', name: 'Ombré Leather Parfum'},
  'tom-ford-ombre-leather': {brand: 'Tom Ford', name: 'Ombré Leather Eau De Parfum', correctedName: 'Ombré Leather Eau de Parfum'},
  'versace-man-eau-fraiche': {brand: 'Versace', name: 'Versace Man Eau Fraîche'},
  'versace-gingembre-petillant': {brand: 'Versace', name: 'Gingembre Pétillant'},
  'clive-christian-masculine-fixture': {
    brand: 'Clive Christian', name: '1872 For Men', correctedName: '1872 Masculine', year: 1999,
    sourceUrl: 'https://us.clivechristian.com/products/1872-masculine',
  },
  'kilian-black-phantom': {brand: 'Kilian', name: 'Black Phantom : Memento Mori', correctedName: 'Black Phantom Memento Mori'},
  'kilian-angels-share': {brand: 'Kilian', name: "Angel'S Share", correctedName: "Angels' Share"},
  'maison-francis-kurkdjian-oud-satin-mood': {brand: 'Maison Francis Kurkdjian', name: 'Oud Satin Mood Eau De Parfum', correctedName: 'Oud Satin Mood Eau de Parfum'},
  'maison-francis-kurkdjian-oud-satin-mood-70ml': {brand: 'Maison Francis Kurkdjian', name: 'Oud Satin Mood Eau De Parfum', correctedName: 'Oud Satin Mood Eau de Parfum', volumeMl: 70},
  'dior-higher': {brand: 'Dior', name: 'Higher'},
  'tom-ford-soleil-blanc-4': {brand: 'Tom Ford', name: 'Soleil Blanc', correctedName: 'Soleil Blanc'},
  'clive-christian-viii-rococo-magnolia': {brand: 'Clive Christian', name: 'Noble Viii Rococo Magnolia'},
  'tiziana-terenzi-luna-collection-cassiopea': {brand: 'Tiziana Terenzi', name: 'Cassiopea', correctedName: 'Cassiopea'},
  'xerjoff-erba-gold': {brand: 'Xerjoff', name: 'Erba Gold Xerjoff', correctedName: 'Erba Gold'},
  'tom-ford-fabulous': {brand: 'Tom Ford', name: 'Fucking Fabulous', correctedName: 'Fucking Fabulous'},
  'amouage-sunshine-for-woman': {brand: 'Amouage', name: 'Sunshine Woman', correctedName: 'Sunshine Woman'},
  'clive-christian-1872-feminine-edition': {brand: 'Clive Christian', name: '1872 For Women', correctedName: '1872 Feminine'},
  'ex-nihilo-blue-talisman': {brand: 'Ex Nihilo', name: 'Blue Talisman 2023', correctedName: 'Blue Talisman'},
};

const manualProfiles: Record<string, ManualProfile> = {
  'clive-christian-strange-heavens-out-of-the-blue': {
    family: 'Восточные гурманские', top: ['Кофе', 'Розовый перец', 'Анис'],
    heart: ['Цветок апельсина', 'Жасмин'], base: ['Карамель', 'Какао', 'Ваниль', 'Дым'],
    perfumers: ['Céline Herbette', 'Kamila Lelakova'], year: 2026,
    sourceUrl: 'https://www.fragrantica.com/perfume/Clive-Christian/Strange-Heavens-Out-Of-The-Blue-122036.html',
  },
  'lorenzo-pazzaglia-sun-gria': {
    family: 'Восточные цветочные',
    top: ['Красный апельсин', 'Корица', 'Мандарин', 'Бергамот', 'Имбирь'],
    heart: ['Виноград', 'Красное вино', 'Малина', 'Чёрная смородина', 'Турецкая роза'],
    base: ['Коричневый сахар', 'Ваниль', 'Тонка', 'Амбра', 'Сандал'],
    perfumers: ['Lorenzo Pazzaglia'], year: 2024,
    sourceUrl: 'https://www.lorenzopazzaglia.com/prodotto/sun-gria/',
  },
  'nishane-hacivat': {
    family: 'Шипровые', top: ['Бергамот', 'Ананас', 'Грейпфрут'],
    heart: ['Жасмин', 'Пачули', 'Кедр'], base: ['Древесные ноты', 'Дубовый мох'], year: 2017,
    sourceUrl: 'https://nishane.com/product/hacivat/',
  },
  'tom-ford-black-lacquer': {
    family: 'Древесные восточные',
    key: ['Аккорд чёрного лака', 'Макассарское эбеновое дерево', 'Тёмный пион', 'Олибанум', 'Виниловый аккорд', 'Атласский кедр'],
    year: 2024, sourceUrl: 'https://www.tomfordbeauty.com/products/black-lacquer-eau-de-parfum',
  },
  'versace-atelier-ambre-nectar': {
    family: 'Восточные древесные', key: ['Амбра', 'Древесные ноты', 'Ваниль'],
    sourceUrl: 'https://www.versace.com/us/en/women/accessories/fragrances-body-care/atelier-versace-fragrances/ambre-nectar-edp-100-ml-black/R712632-R100MLS_RNUL.html',
  },
  'hfc-nirvanesque': {
    family: 'Восточные ванильные', key: ['Ром', 'Давана', 'Древесные ноты', 'Ваниль', 'Амбра'], year: 2022,
    sourceUrl: 'https://www.fragrantica.com/perfume/Haute-Fragrance-Company-HFC/Nirvanesque-77134.html',
  },
  'louis-vuitton-symphony': {
    family: 'Цитрусовые', key: ['Бергамот', 'Грейпфрут', 'Имбирь', 'Мускус'], year: 2021,
    perfumers: ['Jacques Cavallier Belletrud'],
    sourceUrl: 'https://en.louisvuitton.com/eng-nl/products/symphony-nvprod7340024v/LP0527',
    imageArchiveName: 'images/aa0m7zul5ri319y65qpxi86dlxed0gfljr69f9zdqx9hw7f9wtgxpzqnccdy-w500-q85.jpg',
  },
  'tom-ford-eau-d-ombre-leather': {
    family: 'Кожаные восточные', top: ['Имбирь', 'Кориандр', 'Кардамон'],
    heart: ['Кожа', 'Ваниль', 'Шафран'], base: ['Кедр', 'Пачули', 'Сандал', 'Циприол', 'Тонка'], year: 2024,
    sourceUrl: 'https://www.tomfordbeauty.co.uk/fragrance/signature/ombre-leather',
  },
  'penhaligon-s-the-dandy': {
    family: 'Древесные восточные', top: ['Бергамот', 'Малина'], heart: ['Кедр'], base: ['Виски', 'Дуб'],
    sourceUrl: 'https://www.penhaligons.com/uk/en/p/a-london-dandy-eau-de-parfum-100ml--000000000065223847',
  },
  'nishane-hacivat-vetiver': {
    name: 'Hacivat — версия с ветивером', family: 'Шипровые древесные',
    key: ['Ананас', 'Бергамот', 'Ветивер', 'Древесные ноты', 'Дубовый мох'],
    sourceUrl: 'https://nishane.com/product/hacivat/',
    description: 'Карточка относится к Hacivat с выраженным древесно-ветиверовым характером. Версию и концентрацию необходимо подтвердить у менеджера: в раскрытии ожидаются ананас, бергамот, ветивер, древесные ноты и дубовый мох.',
  },
  'louis-vuitton-ambre-levant': {
    family: 'Восточные древесные', top: ['Мандарин', 'Корица'], heart: ['Белый ладан', 'Белый перец'],
    base: ['Амбра', 'Уд', 'Амбраgris', 'Лабданум'], perfumers: ['Jacques Cavallier Belletrud'], year: 2026,
    sourceUrl: 'https://us.louisvuitton.com/eng-us/products/ambre-levant-nvprod7160001v/LP0367',
  },
  'vilhelm-parfumerie-morning-chess': {
    family: 'Кожаные зелёные', top: ['Бергамот'], heart: ['Тосканская кожа', 'Гальбанум'],
    base: ['Пачули', 'Чёрная амбра'], sourceUrl: 'https://us.vilhelmparfumerie.com/collections/my/products/morning-chess',
  },
  'jean-paul-gaultier-divine-le-parfum': {
    family: 'Цветочные гурманские', key: ['Солнечные ноты', 'Лилия', 'Морская соль', 'Безе'], year: 2024,
    sourceUrl: 'https://www.jeanpaulgaultier.com/ww/en/p/range-gaultier-divine/gaultier-divine-le-parfum-eau-de-parfum-intense-000000000065199769',
  },
  'vilhelm-parfumerie-chicago-high': {
    family: 'Ароматические фруктовые', top: ['Шампанское', 'Ананас', 'Бергамот'],
    heart: ['Мёд', 'Табак'], base: ['Кожа', 'Пачули', 'Амбра'], year: 2020,
    sourceUrl: 'https://us.vilhelmparfumerie.com/products/chicago-high',
  },
  'maison-francis-kurkdjian-cologne-forte': {
    name: 'Cologne Forte — коллекция', family: 'Свежие цитрусово-мускусные',
    key: ['Бергамот', 'Мандарин', 'Белые цветы', 'Мускус', 'Сандал'],
    sourceUrl: 'https://www.franciskurkdjian.com/int-en/collections/collection-cologne-forte/',
    description: 'Cologne Forte — коллекция свежих ароматов Maison Francis Kurkdjian, а не один отдельный флакон. В линейке цитрусы, белые цветы, мускус и светлые древесные ноты раскрываются по-разному; конкретную версию нужно подтвердить у менеджера.',
  },
  'kilian-her-majesty': {
    family: 'Фруктовые цветочные', key: ['Белый персик', 'Ром', 'Роза', 'Семена амбретты', 'Папирус', 'Кедр'], year: 2026,
    sourceUrl: 'https://www.kilian-paris.com/product/19797/142866/perfume/her-majesty/the-narcotics',
  },
  'nishane-zenne': {
    family: 'Фруктовые цветочные мускусные', top: ['Грейпфрут', 'Чёрная смородина', 'Ревень'],
    heart: ['Турецкая роза', 'Гардения', 'Сандал'], base: ['Ваниль', 'Амбраgris', 'Мускус'],
    sourceUrl: 'https://nishane.com/product/zenne/',
  },
  'hfc-wear-love-everywhere': {
    family: 'Мягкие восточные цветочные', top: ['Розовый перец', 'Роза', 'Красные ягоды'],
    heart: ['Ирис', 'Магнолия', 'Фиалка', 'Герань'], base: ['Мадагаскарская ваниль', 'Белый мускус', 'Сандал', 'Лабданум'],
    perfumers: ['Vincent Ricord'], year: 2017, sourceUrl: 'https://www.hfcparis.com/catalog/wear-love-everywhere',
  },
  'attar-collection-musk-kashmir': {
    family: 'Цветочные древесно-мускусные', key: ['Белый мускус', 'Белый перец', 'Сандал', 'Гардения', 'Гвоздика'],
    year: 2016, sourceUrl: 'https://www.fragrantica.com/perfume/Attar-Collection/Musk-Kashmir-38134.html',
    imageUrl: '/products/attar-collection-musk-kashmir.jpg',
  },
  'memo-paris-russian-leather': {
    family: 'Кожаные фужерные', top: ['Тимьян', 'Ландыш', 'Циприол'],
    heart: ['Лавандин', 'Шалфей', 'Розмарин'], base: ['Пачули', 'Ваниль', 'Ветивер', 'Кожа'],
    sourceUrl: 'https://us.memoparis.com/products/russian-leather',
  },
  'memo-paris-sintra': {
    family: 'Цветочные гурманские', top: ['Бергамот', 'Красные ягоды', 'Петитгрейн'],
    heart: ['Цветок апельсина', 'Корица', 'Роза'], base: ['Бурбонская ваниль', 'Карамель', 'Мускус маршмеллоу'],
    sourceUrl: 'https://us.memoparis.com/collections/floral/products/sintra-eau-de-parfum',
  },
  'vilhelm-parfumerie-mango-skin': {
    family: 'Фруктовые цветочные', top: ['Ежевика', 'Манго', 'Чёрный перец'],
    heart: ['Ирис', 'Чёрный лотос', 'Жасмин'], base: ['Пачули', 'Ваниль', 'Розовый сахар'],
    sourceUrl: 'https://us.vilhelmparfumerie.com/products/mango-skin',
  },
  'memo-paris-marfa': {
    family: 'Белые цветочные', top: ['Мандарин', 'Персик'],
    heart: ['Иланг-иланг', 'Тубероза', 'Цветок апельсина'], base: ['Кедр', 'Ваниль', 'Тонка', 'Сандал', 'Мускус'],
    sourceUrl: 'https://us.memoparis.com/products/marfa-eau-de-parfum-75ml',
  },
};

const noteTranslations: Record<string, string> = {
  aldehyde: 'Альдегиды', amber: 'Амбра', ambergris: 'Серая амбра', ambrette: 'Амбретта',
  'ambrette seed': 'Семена амбретты', anise: 'Анис', apple: 'Яблоко', apricot: 'Абрикос',
  bergamot: 'Бергамот', benzoin: 'Бензоин', birch: 'Берёза', 'bitter orange': 'Горький апельсин',
  'black pepper': 'Чёрный перец', blackberry: 'Ежевика', 'blackcurrant bud': 'Почки чёрной смородины',
  calone: 'Калон', cardamom: 'Кардамон', caramel: 'Карамель', carnation: 'Гвоздика',
  cashmeran: 'Кашмеран', cedarwood: 'Кедр', 'cherry black': 'Чёрная вишня', cinnamon: 'Корица',
  'ciste labdanum': 'Лабданум', citruses: 'Цитрусы', civet: 'Циветта', 'clary sage': 'Мускатный шалфей',
  clove: 'Гвоздика', cocoa: 'Какао', coffee: 'Кофе', coriander: 'Кориандр', cranberry: 'Клюква',
  'cypriol nagarmota': 'Циприол', elemi: 'Элеми', freesia: 'Фрезия', gardenia: 'Гардения',
  geranium: 'Герань', ginger: 'Имбирь', grapefruit: 'Грейпфрут', 'green apple': 'Зелёное яблоко',
  'guaiac wood': 'Гваяковое дерево', hedione: 'Гедион', heliotrope: 'Гелиотроп', honeysuckle: 'Жимолость',
  incense: 'Ладан', 'incense olibanum': 'Ладан', 'iris orris': 'Ирис', jasmine: 'Жасмин',
  'juniper berries': 'Ягоды можжевельника', lavender: 'Лаванда', leather: 'Кожа', lentisk: 'Мастиковое дерево',
  'lily of the valley': 'Ландыш', lychee: 'Личи', magnolia: 'Магнолия', mandarin: 'Мандарин',
  mango: 'Манго', mate: 'Мате', mimosa: 'Мимоза', musk: 'Мускус', myrrh: 'Мирра', narcissus: 'Нарцисс',
  neroli: 'Нероли', nutmeg: 'Мускатный орех', oakmoss: 'Дубовый мох', opoponax: 'Опопонакс',
  'orange blossom': 'Цветок апельсина', orchid: 'Орхидея', osmanthus: 'Османтус', oud: 'Уд',
  'oud agarwood': 'Уд', 'palisander rosewood': 'Палисандр', 'passion fruit': 'Маракуйя',
  patchouli: 'Пачули', peach: 'Персик', pear: 'Груша', peony: 'Пион', pepper: 'Перец',
  petitgrain: 'Петитгрейн', pineapple: 'Ананас', 'pink pepper': 'Розовый перец', praline: 'Пралине',
  raspberry: 'Малина', 'red ginger': 'Красный имбирь', rhubarb: 'Ревень', rose: 'Роза',
  'rose damascena': 'Дамасская роза', rosemary: 'Розмарин', rum: 'Ром', saffron: 'Шафран',
  sandalwood: 'Сандал', 'sea water': 'Морская вода', spearmint: 'Мята', suede: 'Замша',
  tarragon: 'Тархун', thyme: 'Тимьян', 'tobacco accord': 'Табачный аккорд', 'tobacco leaf': 'Табачный лист',
  toffee: 'Ириска', 'tonka bean': 'Бобы тонка', tuberose: 'Тубероза', vanilla: 'Ваниль',
  vetiver: 'Ветивер', violet: 'Фиалка', 'violet leaves': 'Листья фиалки', 'woody notes': 'Древесные ноты',
  'ylang ylang': 'Иланг-иланг',
};

const familyTranslations: Record<string, string> = {
  WOODY: 'Древесные', FLORAL: 'Цветочные', CITRUS: 'Цитрусовые', CHYPRE: 'Шипровые',
  LEATHER: 'Кожаные', 'AMBERY (ORIENTAL)': 'Восточные', 'AROMATIC FOUGERE': 'Ароматические фужерные',
};

function normalize(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, ' ').trim();
}

function translateNote(value: string) {
  const plain = value.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  const withoutOrigin = value.replace(/\s*\([^)]*\)\s*/g, '').trim();
  return noteTranslations[normalize(plain)] ?? noteTranslations[normalize(withoutOrigin)] ?? withoutOrigin;
}

function sentenceList(values: string[]) {
  if (values.length < 2) return values[0] ?? 'парфюмерные аккорды';
  return `${values.slice(0, -1).join(', ')} и ${values.at(-1)}`;
}

function manualDescription(product: Product, profile: ManualProfile) {
  if (profile.description) return profile.description;
  const opening = profile.top?.length ? `Старт композиции раскрывают ${sentenceList(profile.top)}. ` : '';
  const heart = profile.heart?.length ? `В сердце звучат ${sentenceList(profile.heart)}. ` : '';
  const base = profile.base?.length ? `Шлейф формируют ${sentenceList(profile.base)}.` : '';
  const key = profile.key?.length ? `Главные оттенки композиции: ${sentenceList(profile.key)}.` : '';
  return `${product.brand} ${profile.name ?? product.name} — аромат из семейства «${profile.family.toLowerCase()}». ${opening}${heart}${base}${key}`.trim();
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required');

  const base = (productsJson as Product[]).map((product) => ({...product, description: '', notes: [], sourceUrl: ''}));
  const remote = await loadPublicCatalog(createClient(url, key));
  const merged = mergeCatalogProducts(base, remote);
  const byId = new Map(merged.map((product) => [product.id, product]));
  const records = parseOpenPerfumeCsv(await readFile(DATASET_PATH, 'utf8'));
  const archiveEntries = await loadArchiveEntries(fetch);
  const details: Record<string, DetailsProfile> = {};

  for (const product of base) {
    const enriched = byId.get(product.id)!;
    if (enriched.description.length >= 60 && enriched.sourceUrl.startsWith('https://')) {
      details[product.slug] = {
        name: enriched.name !== product.name ? enriched.name : undefined,
        description: enriched.description,
        fragranceFamily: enriched.fragranceFamily ?? '',
        topNotes: enriched.topNotes ?? [], heartNotes: enriched.heartNotes ?? [],
        baseNotes: enriched.baseNotes ?? [], keyNotes: enriched.keyNotes ?? enriched.notes,
        accords: enriched.accords ?? [], perfumers: enriched.perfumers ?? [],
        launchYear: enriched.launchYear ?? null, imageUrl: enriched.imageUrl,
        sourceUrl: enriched.sourceUrl,
      };
      continue;
    }

    const alias = datasetAliases[product.slug];
    if (alias) {
      const record = records.find((candidate) => normalize(candidate.brand) === normalize(alias.brand)
        && normalize(candidate.name) === normalize(alias.name));
      if (!record) throw new Error(`Dataset alias not found for ${product.slug}: ${alias.brand} ${alias.name}`);
      const archiveName = archiveEntries.has(record.imageName) ? record.imageName : `images/${record.imageName}`;
      const entry = archiveEntries.get(archiveName);
      const notes = record.ingredients.map(translateNote);
      const family = familyTranslations[record.family] ?? (record.family || 'Парфюмерная композиция');
      details[product.slug] = {
        name: alias.correctedName, volumeMl: alias.volumeMl,
        description: `${product.brand} ${alias.correctedName ?? product.name} — аромат семейства ${family.toLowerCase()}. Композицию определяют ${sentenceList(notes.slice(0, 6))}; вместе они создают цельное раскрытие от первых нот до стойкого шлейфа.`,
        fragranceFamily: family, topNotes: [], heartNotes: [], baseNotes: [], keyNotes: notes,
        accords: record.accords, perfumers: [],
        launchYear: alias.year ?? (Number.parseInt(record.year, 10) || null),
        imageUrl: enriched.imageUrl.includes('placeholder') && entry
          ? buildArchiveImageUrl(IMAGE_BASE_URL, archiveName, entry) : enriched.imageUrl,
        sourceUrl: alias.sourceUrl ?? DATASET_SOURCE,
      };
      continue;
    }

    const manual = manualProfiles[product.slug];
    if (!manual) throw new Error(`Missing curated profile for ${product.slug}`);
    const manualArchiveEntry = manual.imageArchiveName
      ? archiveEntries.get(manual.imageArchiveName) : undefined;
    details[product.slug] = {
      name: manual.name, volumeMl: manual.volumeMl,
      description: manualDescription(product, manual), fragranceFamily: manual.family,
      topNotes: manual.top ?? [], heartNotes: manual.heart ?? [], baseNotes: manual.base ?? [],
      keyNotes: manual.key ?? [], accords: manual.accords ?? [], perfumers: manual.perfumers ?? [],
      launchYear: manual.year ?? null,
      imageUrl: manual.imageUrl ?? (enriched.imageUrl.includes('placeholder') && manualArchiveEntry
        ? buildArchiveImageUrl(IMAGE_BASE_URL, manual.imageArchiveName!, manualArchiveEntry)
        : enriched.imageUrl),
      sourceUrl: manual.sourceUrl,
    };
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(details, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(details).length} curated legacy profiles`);
}

await main();
