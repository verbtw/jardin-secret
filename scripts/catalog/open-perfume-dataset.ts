import type {FragellaFragrance} from './fragella-client.js';

const DATASET_URL = 'https://huggingface.co/datasets/doevent/perfume/resolve/main/perfumes.csv';
const ARCHIVE_URL = 'https://huggingface.co/datasets/doevent/perfume/resolve/main/images.zip';
const SOURCE_URL = 'https://huggingface.co/datasets/doevent/perfume';
const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_SIGNATURE = 0x02014b50;
const BRAND_ALIASES: Record<string, string> = {
  'christian dior': 'dior',
  'paco rabanne': 'rabanne',
  'thierry mugler': 'mugler',
  'by kilian': 'kilian',
  'kilian paris': 'kilian',
};

export interface ArchiveEntry {
  localHeaderOffset: number;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
}

interface OpenPerfumeRecord {
  brand: string;
  name: string;
  family: string;
  accords: string[];
  ingredients: string[];
  year: string;
  imageName: string;
}

interface ProviderOptions {
  fetcher?: typeof fetch;
  imageBaseUrl: string;
  archiveEntries?: Map<string, ArchiveEntry>;
}

function normalize(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US').replace(/&/g, ' and ').replace(/[^a-z0-9а-яё]+/gi, ' ').trim();
}

function canonicalBrand(value: string) {
  return BRAND_ALIASES[normalize(value)] ?? normalize(value);
}

function profileKey(brand: string, name: string) {
  return `${canonicalBrand(brand)}|${normalize(name)}`;
}

function splitWords(value: string) {
  return value.split(/\s+/).map((word) => word.trim()).filter(Boolean);
}

function parsePythonStringList(value: string) {
  const values: string[] = [];
  const pattern = /(['"])((?:\\.|(?!\1).)*)\1/g;
  for (const match of value.matchAll(pattern)) {
    values.push(match[2].replace(/\\(['"\\])/g, '$1').trim());
  }
  return values.filter(Boolean);
}

export function parseOpenPerfumeCsv(csv: string): OpenPerfumeRecord[] {
  const [headerLine, ...lines] = csv.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (!headerLine) return [];
  const headers = headerLine.split('|');
  const index = (name: string) => headers.indexOf(name);
  const required = ['brand', 'name_perfume', 'family', 'fragrances', 'ingredients', 'years', 'image_name'];
  if (required.some((name) => index(name) < 0)) throw new Error('Unsupported open perfume dataset schema');

  return lines.map((line) => line.split('|')).filter((cells) => cells.length === headers.length).map((cells) => {
    const family = cells[index('family')].trim();
    const fragranceWords = splitWords(cells[index('fragrances')]);
    return {
      brand: cells[index('brand')].trim(),
      name: cells[index('name_perfume')].trim(),
      family,
      accords: [...new Set([family, ...fragranceWords].filter(Boolean))],
      ingredients: parsePythonStringList(cells[index('ingredients')]),
      year: cells[index('years')].trim(),
      imageName: cells[index('image_name')].trim(),
    };
  }).filter((record) => record.brand && record.name);
}

export function parseCentralDirectory(buffer: Buffer) {
  const entries = new Map<string, ArchiveEntry>();
  let offset = 0;
  while (offset + 46 <= buffer.length) {
    if (buffer.readUInt32LE(offset) !== ZIP_CENTRAL_SIGNATURE) break;
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const end = offset + 46 + nameLength + extraLength + commentLength;
    if (end > buffer.length) throw new Error('Truncated ZIP central directory');
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    if (!name.endsWith('/')) {
      entries.set(name, {localHeaderOffset, compressedSize, uncompressedSize, compressionMethod});
    }
    offset = end;
  }
  return entries;
}

function findEocd(buffer: Buffer) {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === ZIP_EOCD_SIGNATURE) {
      return {size: buffer.readUInt32LE(offset + 12), offset: buffer.readUInt32LE(offset + 16)};
    }
  }
  throw new Error('ZIP end-of-central-directory record not found');
}

async function fetchRange(fetcher: typeof fetch, start: number | '', end: number) {
  const range = start === '' ? `bytes=-${end}` : `bytes=${start}-${end}`;
  const response = await fetcher(ARCHIVE_URL, {headers: {Range: range}});
  if (response.status !== 206) throw new Error(`Perfume image archive does not support ranges: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

export async function loadArchiveEntries(fetcher: typeof fetch) {
  const tail = await fetchRange(fetcher, '', 65_557);
  const directory = findEocd(tail);
  const buffer = await fetchRange(fetcher, directory.offset, directory.offset + directory.size - 1);
  return parseCentralDirectory(buffer);
}

export function buildArchiveImageUrl(baseUrl: string, name: string, entry: ArchiveEntry) {
  const url = new URL(baseUrl);
  url.searchParams.set('offset', String(entry.localHeaderOffset));
  url.searchParams.set('size', String(entry.compressedSize));
  url.searchParams.set('rawSize', String(entry.uncompressedSize));
  url.searchParams.set('method', String(entry.compressionMethod));
  url.searchParams.set('name', name);
  return url.toString();
}

export class OpenPerfumeDatasetProvider {
  private readonly fetcher: typeof fetch;
  private readonly imageBaseUrl: string;
  private archiveEntries?: Map<string, ArchiveEntry>;
  private records?: OpenPerfumeRecord[];
  private recordIndex?: Map<string, OpenPerfumeRecord[]>;

  constructor(options: ProviderOptions) {
    this.fetcher = options.fetcher ?? fetch;
    this.imageBaseUrl = options.imageBaseUrl;
    this.archiveEntries = options.archiveEntries;
  }

  private async load() {
    if (!this.records) {
      const response = await this.fetcher(DATASET_URL);
      if (!response.ok) throw new Error(`Open perfume dataset request failed: ${response.status}`);
      this.records = parseOpenPerfumeCsv(await response.text());
      this.recordIndex = new Map();
      for (const record of this.records) {
        const key = profileKey(record.brand, record.name);
        this.recordIndex.set(key, [...(this.recordIndex.get(key) ?? []), record]);
      }
    }
    this.archiveEntries ??= await loadArchiveEntries(this.fetcher);
  }

  async search(_query: string, profile?: {brand: string; name: string; flanker?: string | null}): Promise<FragellaFragrance[]> {
    await this.load();
    const desiredName = profile ? [profile.name, profile.flanker].filter(Boolean).join(' ') : '';
    const records = profile
      ? this.recordIndex!.get(profileKey(profile.brand, desiredName)) ?? []
      : this.records!.filter((record) => normalize(`${record.brand} ${record.name}`) === normalize(_query));
    return records
      .map((record) => {
        const archiveName = this.archiveEntries!.has(record.imageName)
          ? record.imageName : `images/${record.imageName}`;
        const entry = this.archiveEntries!.get(archiveName);
        return {
          _id: `${record.brand}-${record.name}`,
          Brand: record.brand,
          Name: record.name,
          Year: record.year,
          'Image URL': entry ? buildArchiveImageUrl(this.imageBaseUrl, archiveName, entry) : '',
          'General Notes': record.ingredients,
          'Main Accords': record.accords,
          'Source URL': SOURCE_URL,
        };
      });
  }
}
