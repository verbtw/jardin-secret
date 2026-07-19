export function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('invalid login credentials')) return 'Неверный email или пароль.';
  if (message.includes('already registered') || message.includes('user already exists')) return 'Аккаунт с таким email уже существует.';
  if (message.includes('password')) return 'Пароль должен содержать не менее 8 символов.';
  if (message.includes('rate limit')) return 'Слишком много попыток. Попробуйте немного позже.';
  if (message.includes('not configured')) return 'Личный кабинет временно недоступен. Каталог и заказ через Telegram продолжают работать.';
  return 'Не удалось выполнить запрос. Попробуйте ещё раз.';
}
