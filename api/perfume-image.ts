/// <reference types="node" />
import {inflateRawSync} from 'node:zlib';

const ARCHIVE_URL = 'https://huggingface.co/datasets/doevent/perfume/resolve/main/images.zip';
const MAX_COMPRESSED_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export interface ArchivedImageRequest {
  localHeaderOffset: number;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
  name: string;
}

function integer(value: string | null, name: string, maximum: number) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maximum) throw new Error(`Invalid ${name}`);
  return parsed;
}

export function parseImageRequest(url: URL): ArchivedImageRequest {
  const name = url.searchParams.get('name') ?? '';
  if (!/^[^?#[\]\\]+(?:\/[^?#[\]\\]+)*\.(?:jpe?g|png|webp)$/i.test(name)) throw new Error('Invalid image name');
  const compressionMethod = integer(url.searchParams.get('method'), 'method', 8);
  if (![0, 8].includes(compressionMethod)) throw new Error('Unsupported compression method');
  return {
    localHeaderOffset: integer(url.searchParams.get('offset'), 'offset', 1_000_000_000),
    compressedSize: integer(url.searchParams.get('size'), 'size', MAX_COMPRESSED_SIZE),
    uncompressedSize: integer(url.searchParams.get('rawSize'), 'rawSize', MAX_IMAGE_SIZE),
    compressionMethod,
    name,
  };
}

function imageDataOffset(header: Buffer, request: ArchivedImageRequest) {
  if (header.length < 30 || header.readUInt32LE(0) !== 0x04034b50) throw new Error('Invalid ZIP local header');
  if (header.readUInt16LE(8) !== request.compressionMethod) throw new Error('ZIP compression method mismatch');
  return request.localHeaderOffset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
}

export function decodeArchivedImage(header: Buffer, compressed: Buffer, request: ArchivedImageRequest) {
  imageDataOffset(header, request);
  const image = request.compressionMethod === 0 ? compressed : inflateRawSync(compressed);
  if (image.length !== request.uncompressedSize || image.length > MAX_IMAGE_SIZE) throw new Error('Invalid image size');
  return image;
}

async function fetchRange(start: number, end: number) {
  const response = await fetch(ARCHIVE_URL, {headers: {Range: `bytes=${start}-${end}`}});
  if (response.status !== 206) throw new Error(`Archive range request failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

interface RequestLike { url?: string }
interface ResponseLike {
  status(code: number): ResponseLike;
  setHeader(name: string, value: string): void;
  send(body: Buffer | string): void;
}

export default async function handler(request: RequestLike, response: ResponseLike) {
  try {
    const parsed = parseImageRequest(new URL(request.url ?? '', 'https://jardin-secret-phi.vercel.app'));
    const header = await fetchRange(parsed.localHeaderOffset, parsed.localHeaderOffset + 29);
    const dataOffset = imageDataOffset(header, parsed);
    const compressed = await fetchRange(dataOffset, dataOffset + parsed.compressedSize - 1);
    const image = decodeArchivedImage(header, compressed, parsed);
    const contentType = parsed.name.toLowerCase().endsWith('.png') ? 'image/png'
      : parsed.name.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    response.setHeader('Content-Type', contentType);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.status(200).send(image);
  } catch {
    response.status(404).send('Image not found');
  }
}
