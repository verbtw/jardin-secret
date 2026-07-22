export interface FragellaFragrance {
  _id: string;
  Name: string;
  Brand: string;
  Year?: string;
  OilType?: string;
  'Image URL'?: string;
  'Image URL Transparent'?: string;
  'General Notes'?: string[];
  'Main Accords'?: string[];
  Notes?: {Top?: string[]; Middle?: string[]; Base?: string[]};
  'Source URL'?: string;
}

export interface FragranceProfileQuery {
  brand: string;
  name: string;
  flanker?: string | null;
  concentration: string | null;
}

const brandEquivalents: Record<string, string> = {
  'christian dior': 'dior',
  'paco rabanne': 'rabanne',
  'thierry mugler': 'mugler',
  'by kilian': 'kilian',
  'kilian paris': 'kilian',
};

const concentrationEquivalents: Record<string, string> = {
  edp: 'edp',
  'eau de parfum': 'edp',
  edt: 'edt',
  'eau de toilette': 'edt',
  edc: 'edc',
  'eau de cologne': 'edc',
  parfum: 'parfum',
  perfume: 'parfum',
  extrait: 'extrait',
  'extrait de parfum': 'extrait',
};

const familyTranslations: Record<string, string> = {
  woody: 'древесный',
  floral: 'цветочный',
  citrus: 'цитрусовый',
  aromatic: 'ароматический',
  amber: 'амбровый',
  fresh: 'свежий',
  fruity: 'фруктовый',
  leather: 'кожаный',
  gourmand: 'гурманский',
  spicy: 'пряный',
  aquatic: 'акватический',
  green: 'зелёный',
  powdery: 'пудровый',
};

const familyLabelTranslations: Record<string, string> = {
  woody: 'Древесные', floral: 'Цветочные', citrus: 'Цитрусовые', aromatic: 'Ароматические',
  amber: 'Амбровые', fresh: 'Свежие', fruity: 'Фруктовые', leather: 'Кожаные',
  gourmand: 'Гурманские', spicy: 'Пряные', aquatic: 'Акватические', green: 'Зелёные',
  powdery: 'Пудровые',
};

const noteTranslations: Record<string, string> = {
  rosewood: 'палисандр',
  oud: 'уд',
  sandalwood: 'сандал',
  amber: 'амбра',
  bergamot: 'бергамот',
  lemon: 'лимон',
  jasmine: 'жасмин',
  rose: 'роза',
  vanilla: 'ваниль',
  musk: 'мускус',
  patchouli: 'пачули',
  vetiver: 'ветивер',
  cedar: 'кедр',
  lavender: 'лаванда',
  iris: 'ирис',
  tobacco: 'табак',
};

function normalize(value: string) {
  const normalized = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9а-яё]+/gi, ' ').trim();
  return brandEquivalents[normalized] ?? normalized;
}

function comparableName(value: string) {
  const tokens = normalize(value).split(' ').filter((token) => ![
    'original', 'оригинал', 'unbox', 'unboxed',
  ].includes(token)).map((token) => token === 'men' ? 'man' : token === 'women' ? 'woman' : token);
  const gender = ['man', 'woman'].includes(tokens.at(-1) ?? '') ? tokens.at(-1)! : null;
  return {full: tokens.join(' '), base: gender ? tokens.slice(0, -1).join(' ') : tokens.join(' '), gender};
}

function namesMatch(left: string, right: string) {
  const a = comparableName(left);
  const b = comparableName(right);
  if (a.full === b.full) return true;
  return Boolean(a.base && a.base === b.base && (!a.gender || !b.gender || a.gender === b.gender));
}

function normalizeConcentration(value: string | null | undefined) {
  if (!value) return null;
  return concentrationEquivalents[normalize(value)] ?? normalize(value);
}

export function selectFragellaMatch(profile: FragranceProfileQuery, candidates: FragellaFragrance[]) {
  const brand = normalize(profile.brand);
  const name = [profile.name, profile.flanker].filter(Boolean).join(' ');
  const concentration = normalizeConcentration(profile.concentration);
  return candidates.find((candidate) => {
    if (normalize(candidate.Brand) !== brand || !namesMatch(candidate.Name, name)) return false;
    const candidateConcentration = normalizeConcentration(candidate.OilType);
    return !concentration || !candidateConcentration || concentration === candidateConcentration;
  }) ?? null;
}

function translatedNote(note: string) {
  return noteTranslations[normalize(note)] ?? note.toLocaleLowerCase('ru-RU');
}

export function translateNote(note: string) {
  const translated = translatedNote(note);
  return translated ? translated[0].toLocaleUpperCase('ru-RU') + translated.slice(1) : translated;
}

export function translateFamily(accord: string) {
  const key = normalize(accord);
  return familyLabelTranslations[key] ?? (accord ? accord[0].toLocaleUpperCase('ru-RU') + accord.slice(1) : '');
}

function joinRussian(values: string[]) {
  if (values.length < 2) return values[0] ?? '';
  return `${values.slice(0, -1).join(', ')} и ${values.at(-1)}`;
}

export function buildRussianDescription(fragrance: FragellaFragrance) {
  const familyKey = normalize(fragrance['Main Accords']?.[0] ?? '');
  const family = familyTranslations[familyKey] ?? 'парфюмерный';
  const opening = [fragrance.Notes?.Top?.[0], fragrance.Notes?.Middle?.[0]]
    .filter((value): value is string => Boolean(value)).map(translatedNote);
  const base = (fragrance.Notes?.Base ?? []).slice(0, 2).map(translatedNote);
  const firstSentence = `${fragrance.Brand} ${fragrance.Name} — ${family} аромат.`;
  if (opening.length && base.length) {
    return `${firstSentence} В композиции раскрываются ${joinRussian(opening)}, а завершение формируют ${joinRussian(base)}.`;
  }
  const keyNotes = (fragrance['General Notes'] ?? []).slice(0, 4).map(translatedNote);
  return keyNotes.length
    ? `${firstSentence} Основные ноты: ${joinRussian(keyNotes)}. Композиция раскрывается постепенно и сохраняет характер выбранного направления.`
    : firstSentence;
}

export class FragellaClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly baseUrl = 'https://api.fragella.com/api/v1',
  ) {}

  async remainingRequests() {
    const response = await this.fetcher(new URL(`${this.baseUrl}/usage`), {headers: {'x-api-key': this.apiKey}});
    if (!response.ok) throw new Error(`Fragella usage request failed: ${response.status}`);
    const payload = await response.json() as {usage?: {requests_remaining?: number}};
    const remaining = Number(payload.usage?.requests_remaining);
    return Number.isFinite(remaining) && remaining > 0 ? Math.floor(remaining) : 0;
  }

  async search(query: string): Promise<FragellaFragrance[]> {
    const url = new URL(`${this.baseUrl}/fragrances`);
    url.searchParams.set('search', query);
    url.searchParams.set('limit', '10');
    const response = await this.fetcher(url, {headers: {'x-api-key': this.apiKey}});
    if (!response.ok) throw new Error(`Fragella request failed: ${response.status}`);
    const payload = await response.json() as FragellaFragrance[] | {data?: FragellaFragrance[]};
    return Array.isArray(payload) ? payload : payload.data ?? [];
  }
}
