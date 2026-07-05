// ============================================================================
// CATALOG TYPES — Shared interfaces for the entire catalog
// ============================================================================
// These types are imported by every collection file in /data/collections/*.ts
// and by the barrel re-export in /data/collections/index.ts.
//
// Field mapping:
//   Category.id        → URL slug segment  (e.g. "truva")
//   Category.title     → Display heading   (e.g. "TRUVA Serisi")
//   Product.id         → URL slug segment  (e.g. "truva-08342a")
//   Product.tags       → Feature badges    (e.g. ["%100 Akrilik", ...])
//   Variant.colorHex   → Swatch hex code   (e.g. "#7F8C8D")
// ============================================================================

export interface ProductVariant {
  id: string;
  colorName: string;
  colorHex: string;
  imagePath: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  tags: string[];
  variants: ProductVariant[];
}

export interface Category {
  id: string;
  title: string;
  description: string;
  brand: 'karmen' | 'saten';
  coverImage?: string; // Optional: Override the default cover photo (which is the first product's photo)
  products: Product[];
}
