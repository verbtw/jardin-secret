import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';

const rotationMs = 7_000;

const slides = [
  {
    brand: 'Nishane', name: 'Hacivat', slug: 'nishane-hacivat',
    imageUrl: '/products/packshots/nishane-hacivat.jpg',
  },
  {
    brand: 'Jean Paul Gaultier', name: 'Divine Le Parfum', slug: 'jean-paul-gaultier-divine-le-parfum',
    imageUrl: '/products/packshots/jean-paul-gaultier-divine-le-parfum.png',
  },
  {
    brand: 'Vilhelm Parfumerie', name: 'Mango Skin', slug: 'vilhelm-parfumerie-mango-skin',
    imageUrl: '/products/packshots/vilhelm-parfumerie-mango-skin.jpg',
  },
  {
    brand: 'Memo Paris', name: 'Marfa', slug: 'memo-paris-marfa',
    imageUrl: '/products/packshots/memo-paris-marfa.png',
  },
  {
    brand: 'Penhaligon’s', name: 'The Dandy', slug: 'penhaligon-s-the-dandy',
    imageUrl: '/products/packshots/penhaligon-s-the-dandy.png',
  },
] as const;

export function HeroPerfumeCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = slides[activeIndex];

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, rotationMs);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="hero-carousel">
      <Link className="hero-carousel__product" to={`/product/${active.slug}`} aria-label={`Открыть ${active.name}`}>
        <img key={active.slug} className="hero-carousel__image" src={active.imageUrl} alt={`${active.brand} ${active.name}`} />
      </Link>
      <div className="hero-carousel__caption" aria-live="polite">
        <span>{active.brand}</span>
        <strong>{active.name}</strong>
      </div>
      <div className="hero-carousel__controls" aria-label="Выбрать аромат">
        {slides.map((slide, index) => (
          <button
            className={index === activeIndex ? 'is-active' : ''}
            type="button"
            key={slide.slug}
            aria-label={`Показать ${slide.name}`}
            aria-pressed={index === activeIndex}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}
