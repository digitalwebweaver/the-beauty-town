import { useRef } from 'react';
import { X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';
import { imageUrl } from '@/lib/imageUrl';
import {
  resolveBinding,
  fontFamilyCss,
  type CouponDesign,
  type DesignElement,
} from '@/lib/couponDesign';
import type { CouponDto } from '@/services/coupons.api';
import type { SettingsDto } from '@/services/settings.api';

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

interface ElementViewProps {
  el: DesignElement;
  design: CouponDesign;
  coupon: CouponDto;
  settings: SettingsDto;
  editable: boolean;
  selected: boolean;
  scale: number;
  onSelect?: (id: string | null) => void;
  onChange?: (id: string, patch: Partial<DesignElement>) => void;
  onDelete?: (id: string) => void;
}

// One positioned element — a plain div in read-only/print mode, or a
// draggable+resizable one (via native Pointer Events + setPointerCapture,
// so the drag keeps tracking even once the cursor leaves the element)
// when embedded in the designer. `scale` is the canvas's current zoom —
// pointer deltas arrive in real screen pixels, so they're divided by scale
// to get correct movement in the canvas's own (unscaled) coordinate space.
function ElementView({
  el,
  design,
  coupon,
  settings,
  editable,
  selected,
  scale,
  onSelect,
  onChange,
  onDelete,
}: ElementViewProps) {
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null
  );
  const resizeState = useRef<{
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const startDrag = (e: React.PointerEvent) => {
    if (!editable) return;
    e.stopPropagation();
    onSelect?.(el.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };
  };
  const onDrag = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = (e.clientX - dragState.current.startX) / scale;
    const dy = (e.clientY - dragState.current.startY) / scale;
    const x = clamp(Math.round(dragState.current.origX + dx), 0, Math.max(0, design.width - el.w));
    const y = clamp(Math.round(dragState.current.origY + dy), 0, Math.max(0, design.height - el.h));
    onChange?.(el.id, { x, y });
  };
  const endDrag = () => {
    dragState.current = null;
  };

  const startResize = (e: React.PointerEvent) => {
    if (!editable) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeState.current = { startX: e.clientX, startY: e.clientY, origW: el.w, origH: el.h };
  };
  const onResize = (e: React.PointerEvent) => {
    if (!resizeState.current) return;
    const dx = (e.clientX - resizeState.current.startX) / scale;
    const dy = (e.clientY - resizeState.current.startY) / scale;
    const w = clamp(Math.round(resizeState.current.origW + dx), 12, design.width - el.x);
    const h = clamp(Math.round(resizeState.current.origH + dy), 10, design.height - el.y);
    onChange?.(el.id, { w, h });
  };
  const endResize = () => {
    resizeState.current = null;
  };

  let content: React.ReactNode;
  if (el.type === 'text') {
    const text = resolveBinding(el, coupon, settings);
    content = (
      <div
        className="flex h-full w-full items-center overflow-hidden"
        style={{
          justifyContent:
            el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
          textAlign: el.align ?? 'left',
          fontSize: el.fontSize ?? 14,
          fontWeight: el.fontWeight ?? 400,
          color: el.color ?? '#111111',
          fontFamily: fontFamilyCss(el.fontFamily),
          lineHeight: 1.2,
          whiteSpace: 'pre-wrap',
        }}
      >
        {text || (editable ? <span className="italic text-neutral-300">Empty</span> : null)}
      </div>
    );
  } else if (el.type === 'image') {
    content = el.src ? (
      <img
        src={imageUrl(el.src)}
        alt=""
        draggable={false}
        className="h-full w-full"
        style={{
          objectFit: el.fit ?? 'cover',
          borderRadius: el.borderRadius ?? 0,
          opacity: el.opacity ?? 1,
        }}
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center rounded border border-dashed border-neutral-300 bg-neutral-50 text-[9px] text-neutral-400">
        {editable ? 'No image' : ''}
      </div>
    );
  } else if (el.type === 'shape') {
    content = (
      <div
        className="h-full w-full"
        style={{
          background: el.fill ?? '#e5e5e5',
          opacity: el.opacity ?? 1,
          borderRadius: el.shape === 'circle' ? '50%' : (el.borderRadius ?? 0),
        }}
      />
    );
  } else {
    content = (
      <div className="flex h-full w-full items-center justify-center rounded bg-white p-1">
        <QRCodeSVG
          value={coupon.code || 'CODE'}
          size={256}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'absolute select-none',
        editable && 'cursor-move touch-none',
        editable &&
          !selected &&
          'outline outline-1 outline-dashed outline-transparent hover:outline-neutral-300',
        selected && editable && 'outline outline-2 outline-offset-1 outline-primary'
      )}
      style={{ left: el.x, top: el.y, width: el.w, height: el.h }}
      onPointerDown={startDrag}
      onPointerMove={onDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {content}
      {editable && selected && (
        <>
          <button
            type="button"
            aria-label="Delete element"
            className="absolute -right-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow"
            style={{ transform: `scale(${1 / scale})`, transformOrigin: 'center' }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(el.id);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div
            aria-label="Resize element"
            className="absolute -bottom-2.5 -right-2.5 h-6 w-6 touch-none rounded-full border-2 border-white bg-primary shadow"
            style={{
              cursor: 'nwse-resize',
              transform: `scale(${1 / scale})`,
              transformOrigin: 'center',
            }}
            onPointerDown={startResize}
            onPointerMove={onResize}
            onPointerUp={endResize}
            onPointerCancel={endResize}
          />
        </>
      )}
    </div>
  );
}

interface CouponDesignCanvasProps {
  design: CouponDesign;
  coupon: CouponDto;
  settings: SettingsDto;
  editable?: boolean;
  selectedId?: string | null;
  /** Zoom level for the editable canvas — 1 = 100%. Has no effect on print/preview sizing. */
  scale?: number;
  onSelect?: (id: string | null) => void;
  onChange?: (id: string, patch: Partial<DesignElement>) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

// The one renderer shared by the designer (editable) and the print/preview
// dialog (read-only) — so a design always looks identical in both places.
// Zoom is applied as a CSS transform on the (unscaled) canvas so every
// element's own coordinates stay in real design pixels; an outer wrapper
// reserves the correctly-scaled footprint in the surrounding layout.
function CouponDesignCanvas({
  design,
  coupon,
  settings,
  editable = false,
  selectedId = null,
  scale = 1,
  onSelect,
  onChange,
  onDelete,
  className,
}: CouponDesignCanvasProps) {
  const canvas = (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-2xl border border-neutral-200 shadow-sm',
        className
      )}
      style={{
        width: design.width,
        height: design.height,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
        background: design.backgroundImageUrl
          ? `url(${imageUrl(design.backgroundImageUrl)}) center / cover no-repeat`
          : design.backgroundColor,
      }}
      onPointerDown={() => editable && onSelect?.(null)}
    >
      {design.elements.map((el) => (
        <ElementView
          key={el.id}
          el={el}
          design={design}
          coupon={coupon}
          settings={settings}
          editable={editable}
          selected={editable && selectedId === el.id}
          scale={scale}
          onSelect={onSelect}
          onChange={onChange}
          onDelete={onDelete}
        />
      ))}
    </div>
  );

  if (scale === 1) return canvas;

  // Reserve the visually-scaled footprint so the zoomed canvas doesn't
  // overlap surrounding layout or get clipped by an ancestor's overflow.
  return <div style={{ width: design.width * scale, height: design.height * scale }}>{canvas}</div>;
}

export default CouponDesignCanvas;
