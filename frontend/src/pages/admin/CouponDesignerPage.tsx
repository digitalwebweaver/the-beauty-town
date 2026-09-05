import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Copy,
  Image as ImageIcon,
  Minus,
  Plus,
  QrCode,
  RotateCcw,
  Save,
  Shapes,
  SquareStack,
  Trash2,
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/common/PageHeader';
import CouponDesignCanvas from '@/components/common/CouponDesignCanvas';
import { apiError } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import {
  DEFAULT_DESIGN,
  SAMPLE_COUPON,
  TEXT_BINDING_LABELS,
  newElement,
  type CouponDesign,
  type DesignElement,
  type DesignElementType,
  type TextBinding,
} from '@/lib/couponDesign';
import { useSettings, SETTINGS_FALLBACK } from '@/services/settings.api';
import {
  useCouponDesign,
  useSaveCouponDesign,
  uploadCouponDesignImage,
} from '@/services/couponDesign.api';
import { ROUTES } from '@/constants/routes';

function clone(design: CouponDesign): CouponDesign {
  return JSON.parse(JSON.stringify(design));
}

const FONT_WEIGHTS: { value: number; label: string }[] = [
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semibold' },
  { value: 700, label: 'Bold' },
  { value: 900, label: 'Black' },
];

const TOOLBAR_ITEMS: { type: DesignElementType; label: string; icon: typeof Type }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'shape', label: 'Shape', icon: Shapes },
  { type: 'qrcode', label: 'QR code', icon: QrCode },
];

// 0.5/0.75 let the ~440px-wide canvas actually fit on a phone screen —
// without them, even the smallest zoom (1 = 100%) is wider than most
// mobile viewports.
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2, 2.5, 3];
const DEFAULT_ZOOM = 1.5;
// A rough, one-time viewport check (not a live resize listener — this is
// an editing tool where a mid-session orientation change is a rare edge
// case) so the canvas opens already fitting the screen on a phone/small
// tablet instead of opening cropped.
const MOBILE_DEFAULT_ZOOM = 0.75;

// -------- Properties panel --------

function PropertiesPanel({
  el,
  design,
  onChange,
  onDuplicate,
  onDelete,
  onReorder,
}: {
  el: DesignElement;
  design: CouponDesign;
  onChange: (patch: Partial<DesignElement>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReorder: (dir: 'front' | 'back') => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadFor = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadCouponDesignImage(file);
      onChange({ src: url });
    } catch (err) {
      toast.error(apiError(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(['x', 'y', 'w', 'h'] as const).map((k) => (
          <div key={k} className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">{k}</Label>
            <Input
              type="number"
              value={Math.round(el[k])}
              onChange={(e) =>
                onChange({ [k]: Number(e.target.value) || 0 } as Partial<DesignElement>)
              }
              className="h-8"
            />
          </div>
        ))}
      </div>

      <Separator />

      {el.type === 'text' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Content</Label>
            <Select
              value={el.binding ?? 'static'}
              onValueChange={(v) => onChange({ binding: v as TextBinding })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TEXT_BINDING_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(el.binding ?? 'static') === 'static' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Text</Label>
              <Input value={el.text ?? ''} onChange={(e) => onChange({ text: e.target.value })} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Size</Label>
              <Input
                type="number"
                min={6}
                value={el.fontSize ?? 14}
                onChange={(e) => onChange({ fontSize: Number(e.target.value) || 14 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Weight</Label>
              <Select
                value={String(el.fontWeight ?? 400)}
                onValueChange={(v) => onChange({ fontWeight: Number(v) })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_WEIGHTS.map((w) => (
                    <SelectItem key={w.value} value={String(w.value)}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Alignment</Label>
            <div className="inline-flex w-full overflow-hidden rounded-md border">
              {(['left', 'center', 'right'] as const).map((a) => (
                <Button
                  key={a}
                  type="button"
                  size="sm"
                  variant={(el.align ?? 'left') === a ? 'default' : 'ghost'}
                  className="flex-1 rounded-none capitalize"
                  onClick={() => onChange({ align: a })}
                >
                  {a}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Font</Label>
            <div className="inline-flex w-full overflow-hidden rounded-md border">
              {(['sans', 'serif', 'mono'] as const).map((f) => (
                <Button
                  key={f}
                  type="button"
                  size="sm"
                  variant={(el.fontFamily ?? 'sans') === f ? 'default' : 'ghost'}
                  className="flex-1 rounded-none capitalize"
                  onClick={() => onChange({ fontFamily: f })}
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={el.color ?? '#111111'}
                onChange={(e) => onChange({ color: e.target.value })}
                className="h-8 w-8 shrink-0 cursor-pointer rounded border"
              />
              <Input
                value={el.color ?? '#111111'}
                onChange={(e) => onChange({ color: e.target.value })}
              />
            </div>
          </div>
        </>
      )}

      {el.type === 'image' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Image</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadFor(f);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? 'Uploading…' : el.src ? 'Replace image' : 'Upload image'}
            </Button>
            {el.src && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-destructive"
                onClick={() => onChange({ src: null })}
              >
                Remove image
              </Button>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fit</Label>
            <div className="inline-flex w-full overflow-hidden rounded-md border">
              {(['cover', 'contain'] as const).map((f) => (
                <Button
                  key={f}
                  type="button"
                  size="sm"
                  variant={(el.fit ?? 'cover') === f ? 'default' : 'ghost'}
                  className="flex-1 rounded-none capitalize"
                  onClick={() => onChange({ fit: f })}
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Corner radius</Label>
              <Input
                type="number"
                min={0}
                value={el.borderRadius ?? 0}
                onChange={(e) => onChange({ borderRadius: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Opacity %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={Math.round((el.opacity ?? 1) * 100)}
                onChange={(e) => onChange({ opacity: clampOpacity(e.target.value) })}
              />
            </div>
          </div>
        </>
      )}

      {el.type === 'shape' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Shape</Label>
            <div className="inline-flex w-full overflow-hidden rounded-md border">
              {(['rect', 'circle'] as const).map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={(el.shape ?? 'rect') === s ? 'default' : 'ghost'}
                  className="flex-1 rounded-none capitalize"
                  onClick={() => onChange({ shape: s })}
                >
                  {s === 'rect' ? 'Rectangle' : 'Circle'}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fill color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={el.fill ?? '#e5e5e5'}
                onChange={(e) => onChange({ fill: e.target.value })}
                className="h-8 w-8 shrink-0 cursor-pointer rounded border"
              />
              <Input
                value={el.fill ?? '#e5e5e5'}
                onChange={(e) => onChange({ fill: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(el.shape ?? 'rect') === 'rect' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Corner radius</Label>
                <Input
                  type="number"
                  min={0}
                  value={el.borderRadius ?? 0}
                  onChange={(e) => onChange({ borderRadius: Number(e.target.value) || 0 })}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Opacity %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={Math.round((el.opacity ?? 1) * 100)}
                onChange={(e) => onChange({ opacity: clampOpacity(e.target.value) })}
              />
            </div>
          </div>
        </>
      )}

      {el.type === 'qrcode' && (
        <p className="text-xs text-muted-foreground">
          Always encodes this coupon's code. Drag to move, use the corner handle to resize.
        </p>
      )}

      <Separator />

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onReorder('front')}>
          <SquareStack className="mr-1.5 h-3.5 w-3.5" /> To front
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onReorder('back')}>
          <SquareStack className="mr-1.5 h-3.5 w-3.5 -scale-x-100" /> To back
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDuplicate}>
          <Copy className="mr-1.5 h-3.5 w-3.5" /> Duplicate
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
        </Button>
      </div>
      <p className="text-[11px] leading-tight text-muted-foreground">
        Bounds: canvas is {design.width}×{design.height}px, printed at this exact size on every
        coupon.
      </p>
    </div>
  );
}

function clampOpacity(raw: string): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return 1;
  return Math.min(Math.max(n, 0), 100) / 100;
}

// -------- Page --------

function CouponDesignerPage() {
  const query = useCouponDesign();
  const saveMut = useSaveCouponDesign();
  const settings = useSettings().data ?? SETTINGS_FALLBACK;

  const [design, setDesign] = useState<CouponDesign | null>(null);
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? MOBILE_DEFAULT_ZOOM : DEFAULT_ZOOM
  );
  const bgFileRef = useRef<HTMLInputElement>(null);
  const [uploadingBg, setUploadingBg] = useState(false);

  const zoomIndex = ZOOM_LEVELS.indexOf(zoom);
  const zoomOut = () => setZoom(ZOOM_LEVELS[Math.max(0, zoomIndex - 1)]);
  const zoomIn = () => setZoom(ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, zoomIndex + 1)]);

  // Seed local editable state once the saved design loads — falling back to
  // the built-in starter layout when nothing has been customized yet. Same
  // "adjust state during render" pattern used in SettingsPage.tsx.
  if (query.data && seededFor !== query.data.updated_at) {
    setSeededFor(query.data.updated_at);
    setDesign(clone(query.data.design.elements.length > 0 ? query.data.design : DEFAULT_DESIGN));
    setSelectedId(null);
  }

  const selected = design?.elements.find((e) => e.id === selectedId) ?? null;

  const patchDesign = (patch: Partial<CouponDesign>) =>
    setDesign((d) => (d ? { ...d, ...patch } : d));

  const addElement = (type: DesignElementType) => {
    if (!design) return;
    const el = newElement(type, design);
    setDesign({ ...design, elements: [...design.elements, el] });
    setSelectedId(el.id);
  };

  const updateElement = (id: string, patch: Partial<DesignElement>) => {
    setDesign((d) =>
      d ? { ...d, elements: d.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) } : d
    );
  };

  const deleteElement = (id: string) => {
    setDesign((d) => (d ? { ...d, elements: d.elements.filter((e) => e.id !== id) } : d));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const duplicateElement = (id: string) => {
    setDesign((d) => {
      if (!d) return d;
      const el = d.elements.find((e) => e.id === id);
      if (!el) return d;
      const copy: DesignElement = {
        ...el,
        id: `${el.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        x: Math.min(d.width - el.w, el.x + 12),
        y: Math.min(d.height - el.h, el.y + 12),
      };
      setSelectedId(copy.id);
      return { ...d, elements: [...d.elements, copy] };
    });
  };

  const reorderElement = (id: string, dir: 'front' | 'back') => {
    setDesign((d) => {
      if (!d) return d;
      const el = d.elements.find((e) => e.id === id);
      if (!el) return d;
      const rest = d.elements.filter((e) => e.id !== id);
      return { ...d, elements: dir === 'front' ? [...rest, el] : [el, ...rest] };
    });
  };

  const resetToDefault = () => {
    setDesign(clone(DEFAULT_DESIGN));
    setSelectedId(null);
  };

  const uploadBackground = async (file: File) => {
    setUploadingBg(true);
    try {
      const url = await uploadCouponDesignImage(file);
      patchDesign({ backgroundImageUrl: url });
    } catch (err) {
      toast.error(apiError(err, 'Upload failed'));
    } finally {
      setUploadingBg(false);
    }
  };

  const save = async () => {
    if (!design) return;
    try {
      await saveMut.mutateAsync(design);
      toast.success('Coupon design saved — every printed coupon now uses this layout');
    } catch (err) {
      toast.error(apiError(err, 'Could not save design'));
    }
  };

  return (
    <div>
      <PageHeader
        title="Coupon designer"
        description="Drag, resize and style the one layout every coupon auto-fills into when printed."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={ROUTES.adminCoupons}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to coupons
              </Link>
            </Button>
            <Button variant="outline" onClick={resetToDefault}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset to default
            </Button>
            <Button onClick={save} disabled={!design || saveMut.isPending}>
              <Save className="mr-2 h-4 w-4" /> {saveMut.isPending ? 'Saving…' : 'Save design'}
            </Button>
          </>
        }
      />

      {!design ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <Card>
              <CardContent className="flex flex-wrap items-center gap-2 p-4">
                {TOOLBAR_ITEMS.map((item) => (
                  <Button
                    key={item.type}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addElement(item.type)}
                  >
                    <item.icon className="mr-1.5 h-3.5 w-3.5" /> Add {item.label}
                  </Button>
                ))}
                <Separator orientation="vertical" className="mx-1 h-6" />
                <Label className="text-xs text-muted-foreground">Background</Label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    aria-label="Background color"
                    value={design.backgroundColor}
                    onChange={(e) => patchDesign({ backgroundColor: e.target.value })}
                    className="h-8 w-8 cursor-pointer rounded border-2 border-neutral-300 shadow-sm"
                  />
                  <Input
                    value={design.backgroundColor}
                    onChange={(e) => patchDesign({ backgroundColor: e.target.value })}
                    className="h-8 w-24 font-mono text-xs"
                  />
                </div>
                <input
                  ref={bgFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadBackground(f);
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingBg}
                  onClick={() => bgFileRef.current?.click()}
                >
                  {uploadingBg ? 'Uploading…' : 'Background image'}
                </Button>
                {design.backgroundImageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => patchDesign({ backgroundImageUrl: null })}
                  >
                    Remove
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Click an element to select it — drag to move, use the corner handle to resize.
                  </p>
                  <div className="flex items-center gap-1 rounded-md border p-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Zoom out"
                      aria-label="Zoom out"
                      disabled={zoomIndex <= 0}
                      onClick={zoomOut}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-11 text-center text-xs tabular-nums text-muted-foreground">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Zoom in"
                      aria-label="Zoom in"
                      disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
                      onClick={zoomIn}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div
                  className={cn(
                    // No items-center/justify-center here — centering
                    // content that's wider than the scroll container is a
                    // known trap: the overflow on the leading edge can end
                    // up unreachable by scrolling. `m-auto` on the canvas
                    // wrapper below centers it ONLY while it still fits
                    // (the normal desktop case), and falls back to flush
                    // top-left once it doesn't, so the whole canvas stays
                    // reachable by scrolling at any zoom level — which
                    // matters once it's wider than the viewport (any
                    // phone, most tablets).
                    'flex min-h-[280px] overflow-auto rounded-lg bg-neutral-100 p-6'
                  )}
                >
                  <div className="m-auto">
                    <CouponDesignCanvas
                      design={design}
                      coupon={SAMPLE_COUPON}
                      settings={settings}
                      editable
                      scale={zoom}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      onChange={updateElement}
                      onDelete={deleteElement}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              Preview shown with a sample coupon (code SAVE20) — bound fields like the code,
              headline or validity fill in for real on each printed coupon.
            </p>
          </div>

          <Card className="h-fit lg:sticky lg:top-4">
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-semibold">
                {selected ? `Selected: ${selected.type}` : 'Properties'}
              </h2>
              {selected ? (
                <PropertiesPanel
                  el={selected}
                  design={design}
                  onChange={(patch) => updateElement(selected.id, patch)}
                  onDuplicate={() => duplicateElement(selected.id)}
                  onDelete={() => deleteElement(selected.id)}
                  onReorder={(dir) => reorderElement(selected.id, dir)}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Click an element on the canvas to edit it, or add a new one from the toolbar
                  above.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default CouponDesignerPage;
