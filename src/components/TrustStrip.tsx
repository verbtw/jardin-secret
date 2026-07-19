import { BadgeCheck, MessageCircleMore, Tag } from 'lucide-react';

export function TrustStrip() {
  return (
    <section className="trust-strip" id="original" aria-label="Преимущества">
      <div><BadgeCheck /><span><strong>100% оригинал</strong><small>Каждый флакон проходит проверку</small></span></div>
      <div><Tag /><span><strong>Честная цена</strong><small>Без наценки крупных сетей</small></span></div>
      <div><MessageCircleMore /><span><strong>Помощь с выбором</strong><small>Ответим и подберём в Telegram</small></span></div>
    </section>
  );
}
