import { ArrowDownRight, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Hero() {
  return (
    <section className="hero">
      <div className="hero__wash" aria-hidden="true" />
      <div className="hero__copy">
        <p className="eyebrow">Оригинальная парфюмерия · Россия и СНГ</p>
        <h1 aria-label="Ваш тайный сад ароматов">Ваш тайный<br /><em>сад ароматов</em></h1>
        <p className="hero__lead">Редкие и любимые ароматы без переплаты крупным сетям. Поможем выбрать тот самый.</p>
        <div className="hero__actions"><Link className="button" to="/catalog">Смотреть каталог <ArrowDownRight size={17} /></Link><a className="text-link" href="https://t.me/jardinmanager" target="_blank" rel="noreferrer" aria-label="Написать менеджеру"><Send size={16} />Написать менеджеру</a></div>
      </div>
      <div className="hero__art" aria-hidden="true">
        <div className="glass-orb"><span className="orb-light" /><div className="perfume-cap" /><div className="perfume-bottle"><span>JARDIN</span><i>secret</i><small>eau de parfum</small></div></div>
        <span className="botanical botanical--one" /><span className="botanical botanical--two" />
      </div>
      <div className="hero__index"><span>01</span><i /><span>Найдите свой аромат</span></div>
    </section>
  );
}
