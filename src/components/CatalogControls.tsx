import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { CatalogQuery, CatalogSort } from '../domain/catalog';

export function CatalogControls({ query, brands, onChange, onReset }: {
  query: CatalogQuery;
  brands: string[];
  onChange: (query: CatalogQuery) => void;
  onReset: () => void;
}) {
  const active = Boolean(query.search || query.brand || query.gender || query.availability || query.sort && query.sort !== 'newest');
  return (
    <div className="catalog-controls">
      <label className="search-field">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Поиск ароматов</span>
        <input type="search" value={query.search ?? ''} onChange={(event) => onChange({ ...query, search: event.target.value })} placeholder="Название или бренд" aria-label="Поиск ароматов" />
      </label>
      <div className="filter-row">
        <SlidersHorizontal size={17} aria-hidden="true" />
        <label><span className="sr-only">Бренд</span><select value={query.brand ?? ''} onChange={(event) => onChange({ ...query, brand: event.target.value })}><option value="">Все бренды</option>{brands.map((brand) => <option key={brand}>{brand}</option>)}</select></label>
        <label><span className="sr-only">Для кого</span><select value={query.gender ?? ''} onChange={(event) => onChange({ ...query, gender: event.target.value as CatalogQuery['gender'] })}><option value="">Для всех</option><option value="women">Женские</option><option value="men">Мужские</option><option value="unisex">Унисекс</option></select></label>
        <label><span className="sr-only">Наличие</span><select value={query.availability ?? ''} onChange={(event) => onChange({ ...query, availability: event.target.value as CatalogQuery['availability'] })}><option value="">Любое наличие</option><option value="in-stock">В наличии</option><option value="ask-manager">Уточнить</option></select></label>
        <label><span className="sr-only">Сортировка</span><select value={query.sort ?? 'newest'} onChange={(event) => onChange({ ...query, sort: event.target.value as CatalogSort })}><option value="newest">Сначала новые</option><option value="price-asc">Цена по возрастанию</option><option value="price-desc">Цена по убыванию</option><option value="name">По названию</option></select></label>
        {active && <button className="filter-reset" type="button" onClick={onReset}><X size={15} />Сбросить</button>}
      </div>
    </div>
  );
}
