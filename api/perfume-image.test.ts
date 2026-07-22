import {deflateRawSync} from 'node:zlib';
import {describe, expect, it} from 'vitest';
import {decodeArchivedImage, parseImageRequest} from './perfume-image.js';

describe('perfume image proxy', () => {
  it('accepts only bounded archive coordinates and JPEG names', () => {
    expect(parseImageRequest(new URL('https://shop.example/api/perfume-image?offset=10&size=20&rawSize=30&method=8&name=images%2Fbottle.jpg'))).toEqual({
      localHeaderOffset: 10, compressedSize: 20, uncompressedSize: 30, compressionMethod: 8, name: 'images/bottle.jpg',
    });
    expect(() => parseImageRequest(new URL('https://shop.example/api/perfume-image?offset=10&size=99999999&rawSize=30&method=8&name=x.jpg'))).toThrow();
    expect(() => parseImageRequest(new URL('https://shop.example/api/perfume-image?offset=10&size=20&rawSize=30&method=8&name=x.exe'))).toThrow();
  });

  it('inflates a ZIP entry after validating its local header', () => {
    const image = Buffer.from('jpeg bytes');
    const compressed = deflateRawSync(image);
    const name = Buffer.from('images/bottle.jpg');
    const localHeader = Buffer.alloc(30 + name.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(name.length, 26);
    name.copy(localHeader, 30);

    expect(decodeArchivedImage(localHeader, compressed, {
      localHeaderOffset: 0,
      compressedSize: compressed.length,
      uncompressedSize: image.length,
      compressionMethod: 8,
      name: 'images/bottle.jpg',
    })).toEqual(image);
  });
});
