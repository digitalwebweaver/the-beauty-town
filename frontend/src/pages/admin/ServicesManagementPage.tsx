import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { ArchiveRestore, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
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
import Pagination from '@/components/common/Pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import api from '@/lib/axios';
import { imageUrl } from '@/lib/imageUrl';
import {
  useAdminServices,
  useCategories,
  useCreateService,
  useDeleteService,
  useUpdateService,
  type ServiceDto,
} from '@/services/services.api';

interface FormState {
  categoryId: string;
  name: string;
  description: string;
  gender: 'male' | 'female' | 'unisex';
  priceInr: number;
  durationMinutes: number;
  imageUrl: string;
  isActive: boolean;
  // Empty string = unlimited (matches the DB's NULL default).
  maxConcurrentBookings: string;
}

const EMPTY: FormState = {
  categoryId: '',
  name: '',
  description: '',
  gender: 'unisex',
  priceInr: 0,
  durationMinutes: 30,
  imageUrl: '',
  isActive: true,
  maxConcurrentBookings: '',
};

const PAGE_SIZE = 20;
const ALL = '__all__';

function apiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.error?.message ?? err.message ?? fallback;
  }
  return fallback;
}

function ServicesManagementPage() {
  const categories = useCategories();
  const createMut = useCreateService();
  const updateMut = useUpdateService();
  const deleteMut = useDeleteService();

  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q);
  const [categoryKey, setCategoryKey] = useState(ALL);
  const [gender, setGender] = useState(ALL);
  const [status, setStatus] = useState<'active' | 'archived' | 'all'>('active');
  const [page, setPage] = useState(1);

  // Any filter/search change invalidates the current page number — reset it
  // during render (React's own "adjust state when a value changes" pattern)
  // rather than in an effect, guarded by a "previous filters" ref so it only
  // fires once per actual change.
  const filterKey = `${debouncedQ}|${categoryKey}|${gender}|${status}`;
  const [appliedFilterKey, setAppliedFilterKey] = useState(filterKey);
  if (filterKey !== appliedFilterKey) {
    setAppliedFilterKey(filterKey);
    setPage(1);
  }

  const services = useAdminServices({
    q: debouncedQ || undefined,
    categoryKey: categoryKey === ALL ? undefined : categoryKey,
    gender: gender === ALL ? undefined : gender,
    status,
    page,
    pageSize: PAGE_SIZE,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceDto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<ServiceDto | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = services.data?.data ?? [];

  const openNew = () => {
    setEditing(null);
    setForm({
      ...EMPTY,
      categoryId: categories.data?.[0]?.id ?? '',
    });
    setOpen(true);
  };

  const openEdit = (s: ServiceDto) => {
    setEditing(s);
    setForm({
      categoryId: categories.data?.find((c) => c.key === s.category_key)?.id ?? '',
      name: s.name,
      description: s.description ?? '',
      gender: s.gender,
      priceInr: Number(s.price_inr),
      durationMinutes: s.duration_minutes,
      imageUrl: s.image_url ?? '',
      isActive: s.is_active,
      maxConcurrentBookings:
        s.max_concurrent_bookings != null ? String(s.max_concurrent_bookings) : '',
    });
    setOpen(true);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post('/uploads/service', fd, {
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

  const save = async () => {
    if (!form.name.trim()) return toast.error('Please enter a name');
    if (!form.categoryId) return toast.error('Please pick a category');
    const cap = form.maxConcurrentBookings.trim();
    if (cap && (!/^\d+$/.test(cap) || Number(cap) < 1)) {
      return toast.error('Max concurrent bookings must be a positive whole number');
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          categoryId: form.categoryId,
          name: form.name,
          description: form.description || undefined,
          gender: form.gender,
          priceInr: form.priceInr,
          durationMinutes: form.durationMinutes,
          imageUrl: form.imageUrl || undefined,
          isActive: form.isActive,
          // null explicitly clears the cap back to unlimited.
          maxConcurrentBookings: cap ? Number(cap) : null,
        });
        toast.success('Service updated');
      } else {
        await createMut.mutateAsync({
          categoryId: form.categoryId,
          name: form.name,
          description: form.description || undefined,
          gender: form.gender,
          priceInr: form.priceInr,
          durationMinutes: form.durationMinutes,
          imageUrl: form.imageUrl || undefined,
          maxConcurrentBookings: cap ? Number(cap) : undefined,
        });
        toast.success('Service created');
      }
      setOpen(false);
    } catch (err) {
      toast.error(apiError(err, 'Save failed'));
    }
  };

  const archive = async () => {
    if (!toDelete) return;
    try {
      await deleteMut.mutateAsync(toDelete.id);
      toast.success('Service archived');
      setToDelete(null);
    } catch (err) {
      toast.error(apiError(err, 'Archive failed'));
    }
  };

  const reactivate = async (s: ServiceDto) => {
    try {
      await updateMut.mutateAsync({ id: s.id, isActive: true });
      toast.success('Service reactivated');
    } catch (err) {
      toast.error(apiError(err, 'Reactivate failed'));
    }
  };

  return (
    <div>
      <PageHeader
        title="Services"
        description="Add, edit, or archive the services your salon offers."
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Add service
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, description, or category…"
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={categoryKey} onValueChange={setCategoryKey}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All categories</SelectItem>
                  {categories.data?.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="unisex">Unisex</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="all">All statuses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {services.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : services.isError ? (
            <SectionError
              message="Couldn't load services right now."
              onRetry={() => services.refetch()}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.length === 0 && (
                      <EmptyTableRow
                        colSpan={9}
                        message={
                          q || categoryKey !== ALL || gender !== ALL
                            ? 'No services match your filters.'
                            : 'No services yet.'
                        }
                      />
                    )}
                    {list.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          {s.image_url ? (
                            <img
                              src={imageUrl(s.image_url)}
                              alt={s.name}
                              className="h-10 w-14 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-14 rounded bg-muted" />
                          )}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate font-medium">
                          {s.name}
                        </TableCell>
                        <TableCell>{s.category_label}</TableCell>
                        <TableCell className="capitalize">{s.gender}</TableCell>
                        <TableCell>{s.duration_minutes} min</TableCell>
                        <TableCell>₹{Number(s.price_inr).toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.max_concurrent_bookings != null
                            ? `Up to ${s.max_concurrent_bookings} at once`
                            : 'Unlimited'}
                        </TableCell>
                        <TableCell>
                          {s.is_active ? (
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
                              aria-label={`Edit ${s.name}`}
                              onClick={() => openEdit(s)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {s.is_active ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Archive"
                                aria-label={`Archive ${s.name}`}
                                onClick={() => setToDelete(s)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Reactivate"
                                aria-label={`Reactivate ${s.name}`}
                                onClick={() => reactivate(s)}
                                disabled={updateMut.isPending}
                              >
                                <ArchiveRestore className="h-4 w-4 text-emerald-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                className="mt-4"
                page={page}
                pageSize={PAGE_SIZE}
                total={services.data?.total ?? 0}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit service' : 'Add service'}</DialogTitle>
            <DialogDescription>
              Services appear on the customer-facing menu and booking flow.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-5 overflow-y-auto px-0.5 pb-1">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => setForm({ ...form, categoryId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.data?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      gender: v as FormState['gender'],
                    })
                  }
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
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  value={form.priceInr}
                  onChange={(e) => setForm({ ...form, priceInr: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      durationMinutes: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-concurrent">Max concurrent</Label>
                <Input
                  id="max-concurrent"
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={form.maxConcurrentBookings}
                  onChange={(e) => setForm({ ...form, maxConcurrentBookings: e.target.value })}
                />
              </div>
            </div>
            <p className="-mt-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Max concurrent</span> is how many
              customers this service can serve at the same time (e.g. a 5-chair haircut station).
              Leave blank for unlimited.
            </p>
            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex items-center gap-4 rounded-lg border border-dashed p-3">
                {form.imageUrl ? (
                  <img
                    src={imageUrl(form.imageUrl)}
                    alt="preview"
                    className="h-16 w-24 flex-shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                    No image
                  </div>
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
            {editing && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: !!v })}
                />
                Active (visible on the public site and booking flow)
              </label>
            )}
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
        title="Archive this service?"
        description={
          toDelete
            ? `"${toDelete.name}" will be hidden from the public site and booking flow. It stays here, archived — reactivate it anytime from the row or the Edit dialog.`
            : undefined
        }
        confirmLabel="Archive"
        destructive
        loading={deleteMut.isPending}
        onConfirm={archive}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

export default ServicesManagementPage;
