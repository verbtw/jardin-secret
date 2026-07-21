import type { Product } from '../types/product';

const managerUrl = 'https://t.me/jardinmanager';

export function buildManagerMessage(product: Product, origin: string) {
  const variant = [product.concentration, product.volumeMl ? `${product.volumeMl} мл` : null]
    .filter(Boolean)
    .join(', ');
  const productName = `${product.brand} ${product.name}${variant ? `, ${variant}` : ''}`;
  const productUrl = new URL(`/product/${product.slug}`, origin).toString();
  return `Здравствуйте! Я с сайта Jardin Secret и хочу заказать ${productName}. Подскажите, пожалуйста, актуальную цену и наличие.\n\n${productUrl}`;
}

export function buildManagerUrl(product: Product, origin: string) {
  const url = new URL(managerUrl);
  url.searchParams.set('text', buildManagerMessage(product, origin));
  return url.toString();
}

