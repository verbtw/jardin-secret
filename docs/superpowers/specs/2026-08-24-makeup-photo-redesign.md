# Jardin Secret: photo-first storefront redesign

## Approved reference

The supplied Telegram screenshots approve MAKEUP's product-photo treatment as a reference, adapted to Jardin Secret rather than copied. The requested result is a white, quiet storefront where real perfume packshots lead the composition.

## Visual direction

- Canvas: pure white `#FFFFFF`; porcelain sections `#FAFBF9`; soft borders `#E3E8E4`.
- Brand accents: pine `#213D2E` and leaf `#527863`, used for type and controls rather than photo backgrounds.
- Typography remains Cormorant Garamond for display names, Manrope for interface copy, and IBM Plex Mono for small catalog labels.
- Product names and brands remain title-cased.

## Homepage hero

Replace the decorative lifestyle photo with a real-product carousel. It rotates automatically every seven seconds through a curated set of catalog packshots and also exposes manual dot controls. Each slide shows one real bottle on a white stage plus brand and fragrance name. Motion is a restrained crossfade and is disabled when reduced motion is requested.

## Catalog and product photos

All card, detail, and compact product images use the same white photo surface. Images are contained with consistent breathing room, retain their original colour, and never receive generated gradients, artificial shadows, or blend modes. If an image fails, the existing Jardin Secret placeholder remains the fallback.

## Storefront surface

The catalogue page, header, product grid, and photo cards use white or near-white surfaces. The existing dark brand sections remain to preserve Jardin Secret's identity; the redesign does not turn the whole site into a generic marketplace clone.

## Accessibility and validation

The carousel has readable slide status and named controls. Automatic rotation pauses for reduced motion. Tests cover slide content, timed rotation, manual selection, white photo treatment, and title casing. Browser checks cover 1440 px and 390 px viewports, console errors, overflow, and production rendering.
