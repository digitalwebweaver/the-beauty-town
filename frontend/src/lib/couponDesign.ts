import { formatInr } from '@/lib/formatCurrency';
import type { CouponDto } from '@/services/coupons.api';
import type { SettingsDto } from '@/services/settings.api';

export type DesignElementType = 'text' | 'image' | 'shape' | 'qrcode';

// What a text element's content comes from — either the admin's own words,
// or a live value pulled from whichever coupon is being printed.
export type TextBinding =
  | 'static'
  | 'salonName'
  | 'monogram'
  | 'description'
  | 'headline'
  | 'discountCap'
  | 'code'
  | 'validity'
  | 'minSpend'
  | 'phone'
  | 'address';

export interface DesignElement {
  id: string;
  type: DesignElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  // text
  binding?: TextBinding;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  fontFamily?: 'sans' | 'serif' | 'mono';
  // image
  src?: string | null;
  fit?: 'cover' | 'contain';
  borderRadius?: number;
  opacity?: number;
  // shape
  shape?: 'rect' | 'circle';
  fill?: string;
}

export interface CouponDesign {
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImageUrl?: string | null;
  elements: DesignElement[];
}

export const TEXT_BINDING_LABELS: Record<TextBinding, string> = {
  static: 'Custom text',
  salonName: 'Salon name',
  monogram: 'Salon initial (monogram)',
  description: 'Coupon description',
  headline: 'Discount headline (e.g. 20% OFF)',
  discountCap: 'Discount cap note (e.g. up to ₹300)',
  code: 'Coupon code',
  validity: 'Validity date',
  minSpend: 'Minimum spend note',
  phone: 'Salon phone',
  address: 'Salon address',
};

function headline(c: CouponDto): string {
  return c.discount_type === 'flat'
    ? `${formatInr(c.discount_value)} OFF`
    : `${Number(c.discount_value)}% OFF`;
}

function validityLine(c: CouponDto): string {
  if (c.expires_at) {
    const d = new Date(c.expires_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `Valid until ${d}`;
  }
  return 'No expiry';
}

// The single place that turns a binding into real text — used identically
// by the designer's live preview and the actual print output.
export function resolveBinding(
  el: DesignElement,
  coupon: CouponDto,
  settings: SettingsDto
): string {
  switch (el.binding) {
    case 'salonName':
      return settings.name;
    case 'monogram':
      return settings.name.trim().charAt(0).toUpperCase() || 'S';
    case 'description':
      return coupon.description ?? '';
    case 'headline':
      return headline(coupon);
    case 'discountCap':
      return coupon.discount_type === 'percent' && coupon.max_discount_inr
        ? `up to ${formatInr(coupon.max_discount_inr)}`
        : '';
    case 'code':
      return coupon.code;
    case 'validity':
      return validityLine(coupon);
    case 'minSpend':
      return Number(coupon.min_spend_inr) > 0
        ? `Min. spend ${formatInr(coupon.min_spend_inr)}`
        : '';
    case 'phone':
      return settings.phone ?? '';
    case 'address':
      return settings.address ?? '';
    case 'static':
    default:
      return el.text ?? '';
  }
}

// A realistic example coupon — used only to preview live text bindings
// while designing the reusable template, never shown as real data.
export const SAMPLE_COUPON: CouponDto = {
  id: 'sample',
  code: 'SAVE20',
  description: 'Festive special',
  discount_type: 'percent',
  discount_value: '20',
  max_discount_inr: '300',
  min_spend_inr: '500',
  scope: 'bill',
  starts_at: null,
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  max_redemptions: null,
  redemptions_count: 0,
  per_customer_limit: 1,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const ACCENT = '#e11d48';

// The built-in starter layout — a two-panel ticket (branding + headline on
// the left, a tear-off code stub on the right), roughly the same design
// language as the previous fixed template. Shown whenever a design has no
// elements yet, both in the designer (as a starting point to customize)
// and on print (so coupons look good before anyone opens the designer).
export const DEFAULT_DESIGN: CouponDesign = {
  width: 440,
  height: 200,
  backgroundColor: '#ffffff',
  backgroundImageUrl: null,
  elements: [
    {
      id: 'monogram-bg',
      type: 'shape',
      x: 16,
      y: 16,
      w: 40,
      h: 40,
      shape: 'circle',
      fill: ACCENT,
    },
    {
      id: 'monogram-text',
      type: 'text',
      x: 16,
      y: 16,
      w: 40,
      h: 40,
      binding: 'monogram',
      color: '#ffffff',
      fontSize: 18,
      fontWeight: 700,
      align: 'center',
      fontFamily: 'serif',
    },
    {
      id: 'salon-name',
      type: 'text',
      x: 64,
      y: 17,
      w: 270,
      h: 20,
      binding: 'salonName',
      color: '#111111',
      fontSize: 14,
      fontWeight: 700,
      align: 'left',
      fontFamily: 'sans',
    },
    {
      id: 'description',
      type: 'text',
      x: 64,
      y: 37,
      w: 270,
      h: 16,
      binding: 'description',
      color: '#777777',
      fontSize: 10,
      fontWeight: 400,
      align: 'left',
      fontFamily: 'sans',
    },
    {
      id: 'headline',
      type: 'text',
      x: 16,
      y: 68,
      w: 320,
      h: 40,
      binding: 'headline',
      color: ACCENT,
      fontSize: 28,
      fontWeight: 900,
      align: 'left',
      fontFamily: 'sans',
    },
    {
      id: 'discount-cap',
      type: 'text',
      x: 16,
      y: 108,
      w: 320,
      h: 14,
      binding: 'discountCap',
      color: '#777777',
      fontSize: 10,
      fontWeight: 400,
      align: 'left',
      fontFamily: 'sans',
    },
    {
      id: 'validity',
      type: 'text',
      x: 16,
      y: 150,
      w: 160,
      h: 14,
      binding: 'validity',
      color: '#777777',
      fontSize: 9,
      fontWeight: 400,
      align: 'left',
      fontFamily: 'sans',
    },
    {
      id: 'min-spend',
      type: 'text',
      x: 16,
      y: 166,
      w: 160,
      h: 14,
      binding: 'minSpend',
      color: '#777777',
      fontSize: 9,
      fontWeight: 400,
      align: 'left',
      fontFamily: 'sans',
    },
    {
      id: 'phone',
      type: 'text',
      x: 176,
      y: 150,
      w: 176,
      h: 14,
      binding: 'phone',
      color: '#777777',
      fontSize: 9,
      fontWeight: 400,
      align: 'right',
      fontFamily: 'sans',
    },
    {
      id: 'address',
      type: 'text',
      x: 176,
      y: 166,
      w: 176,
      h: 30,
      binding: 'address',
      color: '#777777',
      fontSize: 8,
      fontWeight: 400,
      align: 'right',
      fontFamily: 'sans',
    },
    {
      id: 'divider',
      type: 'shape',
      x: 352,
      y: 10,
      w: 1,
      h: 180,
      shape: 'rect',
      fill: '#d4d4d4',
    },
    {
      id: 'code',
      type: 'text',
      x: 356,
      y: 16,
      w: 76,
      h: 32,
      binding: 'code',
      color: '#111111',
      fontSize: 14,
      fontWeight: 700,
      align: 'center',
      fontFamily: 'mono',
    },
    {
      id: 'qr',
      type: 'qrcode',
      x: 362,
      y: 54,
      w: 64,
      h: 64,
    },
    {
      id: 'stub-caption',
      type: 'text',
      x: 352,
      y: 124,
      w: 88,
      h: 40,
      binding: 'static',
      text: 'Show this at checkout',
      color: '#999999',
      fontSize: 8,
      fontWeight: 400,
      align: 'center',
      fontFamily: 'sans',
    },
  ],
};

export function newElement(type: DesignElementType, canvas: CouponDesign): DesignElement {
  const id = `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const cx = Math.max(0, Math.round(canvas.width / 2 - 60));
  const cy = Math.max(0, Math.round(canvas.height / 2 - 20));
  switch (type) {
    case 'text':
      return {
        id,
        type,
        x: cx,
        y: cy,
        w: 160,
        h: 24,
        binding: 'static',
        text: 'New text',
        color: '#111111',
        fontSize: 14,
        fontWeight: 500,
        align: 'left',
        fontFamily: 'sans',
      };
    case 'image':
      return { id, type, x: cx, y: cy, w: 100, h: 100, src: null, fit: 'cover', opacity: 1 };
    case 'shape':
      return { id, type, x: cx, y: cy, w: 100, h: 60, shape: 'rect', fill: '#f3d1de', opacity: 1 };
    case 'qrcode':
      return { id, type, x: cx, y: cy, w: 64, h: 64 };
  }
}

export function fontFamilyCss(f: DesignElement['fontFamily']): string {
  switch (f) {
    case 'serif':
      return 'Georgia, "Times New Roman", serif';
    case 'mono':
      return '"SFMono-Regular", Menlo, Consolas, monospace';
    default:
      return 'inherit';
  }
}
