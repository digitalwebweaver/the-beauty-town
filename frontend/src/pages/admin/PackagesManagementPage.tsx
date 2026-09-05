import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/common/PageHeader';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyTableRow from '@/components/common/EmptyTableRow';
import SectionError from '@/components/common/SectionError';
import api from '@/lib/axios';
import { apiError } from '@/lib/apiError';
import { imageUrl } from '@/lib/imageUrl';
import { useServices } from '@/services/services.api';
import {
  useAdminPackages,
  useCreatePackage,
  useDeletePackage,
  useUpdatePackage,
  type PackageDto,
} from '@/services/packages.api';

interface FormState {
  name: string;
  category: string;
  gender: 'male' | 'female' | 'unisex';
  description: string;
  priceInr: number;
  worthInr: string;
  validityLabel: string;
  inclusions: string[];
  imageUrl: string;
  serviceIds: string[];
  isActive: boolean;
}

const EMPTY: FormState = {
  name: '',
  category: '',
  gender: 'unisex',
  description: '',
  priceInr: 0,
  worthInr: '',
  validityLabel: '',
  inclusions: [],
  imageUrl: '',
  serviceIds: [],
  isActive: true,
};

function PackagesManagementPage() {
  const packages = useAdminPackages();
  const services = useServices();
  const createMut = useCreatePackage();
  const updateMut = useUpdatePackage();
  const deleteMut = useDeletePackage();

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PackageDto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<PackageDto | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!packages.data) return [];
    return packages.data.filter(
      (p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.category.toLowerCase().includes(q.toLowerCase())
    );
  }, [packages.data, q]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (p: PackageDto) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      gender: p.gender,
      description: p.description ?? '',
      priceInr: Number(p.price_inr),
      worthInr: p.worth_inr ?? '',
      validityLabel: p.validity_label ?? '',
      inclusions: p.inclusions,
      imageUrl: p.image_url ?? '',
      serviceIds: p.services.map((s) => s.id),
      isActive: p.is_active,
    });
    setOpen(true);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post('/uploads/package', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((f) => ({ ...f, imageUrl: data.data.url as string }));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(apiError(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const toggleService = (id: string) => {
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id)
        ? f.serviceIds.filter((s) => s !== id)
        : [...f.serviceIds, id],
    }));
  };

  const setInclusion = (i: number, value: string) => {
    setForm((f) => ({
      ...f,
      inclusions: f.inclusions.map((line, idx) => (idx === i ? value : line)),
    }));
  };
  const addInclusion = () => setForm((f) => ({ ...f, inclusions: [...f.inclusions, ''] }));
  const removeInclusion = (i: number) =>
    setForm((f) => ({ ...f, inclusions: f.inclusions.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!form.name.trim()) return toast.error('Please enter a name');
    if (!form.category.trim()) return toast.error('Please enter a category');
    const payload = {
      name: form.name,
      category: form.category,
      gender: form.gender,
      description: form.description || undefined,
      priceInr: form.priceInr,
      worthInr: form.worthInr === '' ? undefined : Number(form.worthInr),
      validityLabel: form.validityLabel || undefined,
      inclusions: form.inclusions.map((l) => l.trim()).filter(Boolean),
      imageUrl: form.imageUrl || undefined,
      serviceIds: form.serviceIds,
    };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...payload, isActive: form.isActive });
        toast.success('Package updated');
      } else {
        await createMut.mutateAsync(payload);
        toast.success('Package created');
      }
      setOpen(false);
    } catch (err) {
      toast.error(apiError(err, 'Save failed'));
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await deleteMut.mutateAsync(toDelete.id);
      toast.success('Package archived');
      setToDelete(null);
    } catch (err) {
      toast.error(apiError(err, 'Archive failed'));
    }
  };

  return (
    <div>
      <PageHeader
        title="Packages"
        description="Memberships, event packages, and bundles — sold on their own flat price."
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Add package
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search packages…"
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {packages.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : packages.isError ? (
            <SectionError
              message="Couldn't load packages right now."
              onRetry={() => packages.refetch()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <EmptyTableRow
                    colSpan={8}
                    message={q ? 'No packages match your search.' : 'No packages yet.'}
                  />
                )}
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.image_url ? (
                        <img
                          src={imageUrl(p.image_url)}
                          alt={p.name}
                          className="h-10 w-14 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-14 rounded bg-muted" />
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">{p.name}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell className="capitalize">{p.gender}</TableCell>
                    <TableCell>₹{Number(p.price_inr).toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      {p.is_bookable ? (
                        <Badge variant="outline">Book now</Badge>
                      ) : (
                        <Badge variant="outline">Enquire</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.is_active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline">Archived</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          aria-label={`Edit ${p.name}`}
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Archive"
                          aria-label={`Archive ${p.name}`}
                          onClick={() => setToDelete(p)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit package' : 'Add package'}</DialogTitle>
            <DialogDescription>
              Packages appear on the public Packages page, grouped by category.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="pkg-name">Name</Label>
              <Input
                id="pkg-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pkg-category">Category</Label>
                <Input
                  id="pkg-category"
                  placeholder="e.g. Groom Package"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm({ ...form, gender: v as FormState['gender'] })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unisex">Unisex</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-description">Description</Label>
              <Textarea
                id="pkg-description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pkg-price">Price (₹)</Label>
                <Input
                  id="pkg-price"
                  type="number"
                  value={form.priceInr}
                  onChange={(e) => setForm({ ...form, priceInr: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-worth">Worth (₹, optional)</Label>
                <Input
                  id="pkg-worth"
                  type="number"
                  placeholder="For a struck-through price"
                  value={form.worthInr}
                  onChange={(e) => setForm({ ...form, worthInr: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-validity">Validity (optional)</Label>
                <Input
                  id="pkg-validity"
                  placeholder="e.g. 6 Months"
                  value={form.validityLabel}
                  onChange={(e) => setForm({ ...form, validityLabel: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>What's included</Label>
              <div className="space-y-2">
                {form.inclusions.map((line, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={line}
                      placeholder="e.g. Unlimited Free Threading"
                      onChange={(e) => setInclusion(i, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Remove line"
                      aria-label={`Remove inclusion ${i + 1}`}
                      onClick={() => removeInclusion(i)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addInclusion}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add line
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Linked services (optional)</Label>
              <div className="flex max-h-40 flex-wrap gap-3 overflow-y-auto rounded-lg border p-3">
                {services.data?.map((s) => {
                  const on = form.serviceIds.includes(s.id);
                  return (
                    <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox checked={on} onCheckedChange={() => toggleService(s.id)} />
                      {s.name} · ₹{Number(s.price_inr).toLocaleString('en-IN')}
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Linked packages show a "Book Now" that books these services at this package's flat
                price. Leave empty for enquiry-only packages (memberships, custom events) — those
                show "Enquire Now" instead.
              </p>
            </div>

            {editing && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: !!v })}
                />
                Active (visible on the public Packages page)
              </label>
            )}

            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex items-center gap-3">
                {form.imageUrl && (
                  <img
                    src={imageUrl(form.imageUrl)}
                    alt="preview"
                    className="h-14 w-20 rounded object-cover"
                  />
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? 'Uploading…' : 'Upload'}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        title="Archive this package?"
        description={
          toDelete
            ? `"${toDelete.name}" will be hidden from the public Packages page and can no longer be booked. It stays here, archived — reactivate it anytime from Edit.`
            : undefined
        }
        confirmLabel="Archive"
        destructive
        loading={deleteMut.isPending}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

export default PackagesManagementPage;
