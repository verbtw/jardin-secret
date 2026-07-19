import type { CartLine } from './cart';
import type { Product } from '../types/product';

export interface CheckoutValues { name: string; phone: string; city: string; address: string; delivery: string; comment: string }
export type CheckoutErrors = Partial<Record<keyof CheckoutValues, string>>;
const rubles = new Intl.NumberFormat('ru-RU');

export function validateCheckout(values: CheckoutValues): CheckoutErrors {
  const errors: CheckoutErrors = {};
  if (!values.name.trim()) errors.name = 'Укажите имя';
  if (!values.phone.trim()) errors.phone = 'Укажите телефон';
  else if (values.phone.replace(/\D/g, '').length < 10) errors.phone = 'Проверьте номер телефона';
  if (!values.city.trim()) errors.city = 'Укажите город';
  if (!values.address.trim()) errors.address = 'Укажите адрес или пункт выдачи';
  if (!values.delivery.trim()) errors.delivery = 'Выберите способ доставки';
  return errors;
}

export function formatOrder(values: CheckoutValues, lines: CartLine[], products: Product[]) {
  const items = lines.map((line, index) => {
    const product = products.find((item) => item.id === line.productId)!;
    const price = product.priceRub ? `${rubles.format(product.priceRub * line.quantity)} ₽` : 'цену уточнить';
    return `${index + 1}. ${product.brand} ${product.name} — ${line.quantity} шт. — ${price}\n   ${product.sourceUrl}`;
  }).join('\n');
  return [
    'Здравствуйте! Хочу оформить заказ в Jardin Secret:', '', items, '',
    `Имя: ${values.name.trim()}`, `Телефон: ${values.phone.trim()}`, `Город: ${values.city.trim()}`,
    `Адрес / ПВЗ: ${values.address.trim()}`, `Доставка: ${values.delivery.trim()}`,
    values.comment.trim() ? `Комментарий: ${values.comment.trim()}` : '', '',
    'Стоимость и наличие подтвердит менеджер.',
  ].filter((line, index, array) => line !== '' || array[index - 1] !== '').join('\n');
}
