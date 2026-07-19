import { ArrowUpRight, BadgeCheck, MessageCircle, PackageCheck, Send, Truck } from 'lucide-react';
import type { ReactNode } from 'react';

const managerUrl = 'https://t.me/jardinmanager';

export function OriginalityPage() {
  return <main className="page information-page"><InfoHero eyebrow="Оригинальность" title="Только оригинальная парфюмерия" lead="В Jardin Secret нет копий, аналогов и ароматов «по мотивам». Перед заказом можно спокойно уточнить всё, что важно именно вам." /><section className="info-grid" aria-label="Как проверить аромат до покупки"><InfoCard icon={<PackageCheck />} title="Посмотрите до оплаты" text="Попросите менеджера прислать актуальные фото флакона, коробки, плёнки и комплектации конкретной позиции." /><InfoCard icon={<BadgeCheck />} title="Уточните маркировку" text="Если для вас важен батч-код или страна выпуска, напишите об этом до оформления — менеджер проверит доступный флакон." /><InfoCard icon={<MessageCircle />} title="Задайте любой вопрос" text="Не нужно покупать вслепую. Сначала получите подтверждение цены, объёма, наличия и деталей упаковки." /></section><InfoAction title="Хотите проверить конкретный аромат?" text="Отправьте менеджеру название или ссылку на карточку — он ответит по фактическому товару." /></main>;
}

export function DeliveryPage() {
  return <main className="page information-page"><InfoHero eyebrow="Доставка и оплата" title="Доставка по России и СНГ" lead="Подбираем способ отправки под ваш город. Итоговые сроки и стоимость менеджер сообщает до подтверждения заказа." /><section className="info-grid" aria-label="Условия доставки"><InfoCard icon={<Truck />} title="СДЭК" text="Доставка до удобного пункта выдачи или курьером — доступность и тариф зависят от населённого пункта." /><InfoCard icon={<PackageCheck />} title="Почта России" text="Подходит для городов, где нет удобного пункта СДЭК. Точный вариант согласуем перед отправкой." /><InfoCard icon={<Send />} title="Сначала подтверждение" text="Онлайн-оплаты на сайте нет. Менеджер сначала подтверждает аромат, цену, объём, наличие и условия доставки." /></section><InfoAction title="Рассчитать доставку" text="Напишите город и нужный аромат — менеджер предложит доступные варианты." /></main>;
}

export function ContactsPage() {
  return <main className="page information-page"><InfoHero eyebrow="Контакты" title="Мы на связи" lead="Выберите нужный диалог: заказ, новости магазина, отзывы покупателей или сотрудничество." /><section className="contact-directory" aria-label="Контакты Jardin Secret"><ContactLink label="Заказ и консультация" handle="@jardinmanager" href={managerUrl} /><ContactLink label="Каталог и новинки" handle="@jardinnsecret" href="https://t.me/jardinnsecret" /><ContactLink label="Отзывы покупателей" handle="@jardinotzivi" href="https://t.me/jardinotzivi" /><ContactLink label="Сотрудничество" handle="@aminakulieva" href="https://t.me/aminakulieva" /></section><p className="creator-note">Дизайн и разработка сайта — verbtw.</p></main>;
}

function InfoHero({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return <header className="page-heading info-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{lead}</p></header>;
}

function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <article className="info-card"><span className="info-card__icon" aria-hidden="true">{icon}</span><h2>{title}</h2><p>{text}</p></article>;
}

function InfoAction({ title, text }: { title: string; text: string }) {
  return <section className="info-action"><div><p className="eyebrow">Написать напрямую</p><h2>{title}</h2><p>{text}</p></div><a className="button button--light" href={managerUrl} target="_blank" rel="noreferrer">Открыть Telegram <ArrowUpRight size={17} /></a></section>;
}

function ContactLink({ label, handle, href }: { label: string; handle: string; href: string }) {
  return <a className="contact-directory__item" href={href} target="_blank" rel="noreferrer"><span>{label}</span><strong>{handle}</strong><ArrowUpRight aria-hidden="true" /></a>;
}
