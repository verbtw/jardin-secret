type ProductImageProps = {
  src: string;
  alt: string;
  variant: 'card' | 'detail' | 'compact';
  className?: string;
};

const placeholder = '/products/placeholder.svg';

export function ProductImage({src, alt, variant, className = ''}: ProductImageProps) {
  const classes = ['product-image', `product-image--${variant}`, className].filter(Boolean).join(' ');

  return (
    <div className={classes} data-testid="product-image">
      <div className="product-image__stage">
        <img
          className="product-image__media"
          src={src}
          alt={alt}
          loading={variant === 'detail' ? 'eager' : 'lazy'}
          onError={(event) => {
            if (!event.currentTarget.src.endsWith(placeholder)) event.currentTarget.src = placeholder;
          }}
        />
      </div>
    </div>
  );
}
