import {Link} from 'react-router-dom';

export function BrandLogo({light = false}: {light?: boolean}) {
  return (
    <Link className={`brand-logo${light ? ' brand-logo--light' : ''}`} to="/" aria-label="Jardin Secret — главная">
      <span className="brand-logo__art" data-testid="brand-logo-art" aria-hidden="true" />
    </Link>
  );
}
