import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Power, PowerOff, Star, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import PageHeader from '@/components/common/PageHeader';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { apiError } from '@/lib/apiError';
import { imageUrl } from '@/lib/imageUrl';
import api from '@/lib/axios';
import { digitsOnly, lettersOnly, nameInputProps, phoneInputProps } from '@/lib/inputHelpers';
import {
  useCreateStaff,
  useDeactivateStaff,
  useStaff,
  useUpdateStaff,
  type StaffDto,
} from '@/services/staff.api';
import { useCategories } from '@/services/services.api';

interface FormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  roleTitle: string;
  bio: string;
  experienceYears: number;
  specialties: string[];
  avatarUrl: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  name: '',
  email: '',
  phone: '',
  password: '',
  roleTitle: '',
  bio: '',
  experienceYears: 0,
  specialties: [],
  avatarUrl: '',
  isActive: true,
};

function StaffManagementPage() {
  const staff = useStaff({ includeInactive: true });
  const categories = useCategories();
  const createMut = useCreateStaff();
  const updateMut = useUpdateStaff();
  const deactivateMut = useDeactivateStaff();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffDto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [toRemove, setToRemove] = useState<StaffDto | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const active = useMemo(() => staff.data?.filter((s) => s.is_active) ?? [], [staff.data]);
  const inactive = useMemo(() => staff.data?.filter((s) => !s.is_active) ?? [], [staff.data]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (s: StaffDto) => {
    setEditing(s);
    setForm({
      name: s.name,
      email: s.email,
      phone: s.phone ?? '',
      password: '',
      roleTitle: s.role_title,
      bio: s.bio ?? '',
      experienceYears: s.experience_years,
      specialties: s.specialties,
      avatarUrl: s.avatar_url ?? '',
      isActive: s.is_active,
    });
    setOpen(true);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post('/uploads/staff', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((f) => ({ ...f, avatarUrl: data.data.url as string }));
      toast.success('Photo uploaded');
    } catch (err) {
      toast.error(apiError(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const toggleSpecialty = (key: string) => {
    setForm((f) => ({
      ...f,
      specialties: f.specialties.includes(key)
        ? f.specialties.filter((k) => k !== key)
        : [...f.specialties, key],
    }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.roleTitle.trim())
      return toast.error('Name and role title are required');

    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.user_id,
          name: form.name,
          phone: form.phone || undefined,
          avatarUrl: form.avatarUrl || undefined,
          roleTitle: form.roleTitle,
          bio: form.bio || undefined,
          experienceYears: form.experienceYears,
          specialties: form.specialties,
          isActive: form.isActive,
        });
        toast.success('Staff updated');
      } else {
        if (!form.email.trim() || form.password.length < 6)
          return toast.error('Email and password (min 6 chars) required for new staff');
        await createMut.mutateAsync({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
          roleTitle: form.roleTitle,
          bio: form.bio || undefined,
          experienceYears: form.experienceYears,
          specialties: form.specialties,
          avatarUrl: form.avatarUrl || undefined,
        });
        toast.success('Staff added');
      }
      setOpen(false);
    } catch (err) {
      toast.error(apiError(err, 'Save failed'));
    }
  };

  const toggleActive = async (s: StaffDto) => {
    try {
      await updateMut.mutateAsync({
        id: s.user_id,
        isActive: !s.is_active,
      });
      toast.success(`${s.name} ${s.is_active ? 'deactivated' : 'activated'}`);
    } catch (err) {
      toast.error(apiError(err, 'Update failed'));
    }
  };

  const deactivate = async () => {
    if (!toRemove) return;
    try {
      await deactivateMut.mutateAsync(toRemove.user_id);
      toast.success('Deactivated');
      setToRemove(null);
    } catch (err) {
      toast.error(apiError(err, 'Deactivate failed'));
    }
  };

  const renderCard = (s: StaffDto) => (
    <Card key={s.user_id} className={s.is_active ? '' : 'opacity-60'}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={imageUrl(s.avatar_url)} alt={s.name} />
            <AvatarFallback>{s.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="truncate font-semibold">{s.name}</h3>
                <p className="text-xs text-muted-foreground">{s.role_title}</p>
              </div>
              {!s.is_active && (
                <Badge variant="outline" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {Number(s.rating).toFixed(1)}
              </span>
              <span className="text-muted-foreground">{s.experience_years}y exp</span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{s.bio || 'No bio'}</p>

        <div className="mt-4 flex flex-wrap gap-1">
          {s.specialties.map((sp) => (
            <Badge key={sp} variant="secondary" className="capitalize">
              {sp}
            </Badge>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(s)}>
            <Pencil className="mr-2 h-3 w-3" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={s.is_active ? 'Deactivate' : 'Activate'}
            aria-label={`${s.is_active ? 'Deactivate' : 'Activate'} ${s.name}`}
            onClick={() => toggleActive(s)}
          >
            {s.is_active ? (
              <PowerOff className="h-4 w-4 text-amber-600" />
            ) : (
              <Power className="h-4 w-4 text-emerald-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Remove"
            aria-label={`Remove ${s.name}`}
            onClick={() => setToRemove(s)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Add, edit, or deactivate stylists, therapists, and technicians."
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Add staff
          </Button>
        }
      />

      {staff.isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              Active ({active.length})
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{active.map(renderCard)}</div>
          </div>

          {inactive.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                Inactive ({inactive.length})
              </h3>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {inactive.map(renderCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add staff'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update profile details. Password cannot be changed here.'
                : 'Create a new stylist. They will log in with the email + password.'}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={imageUrl(form.avatarUrl)} alt={form.name} />
                <AvatarFallback>{form.name.slice(0, 2) || '??'}</AvatarFallback>
              </Avatar>
              <div>
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
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? 'Uploading…' : 'Upload photo'}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  {...nameInputProps}
                  onChange={(e) => setForm({ ...form, name: lettersOnly(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleTitle">Role title *</Label>
                <Input
                  id="roleTitle"
                  value={form.roleTitle}
                  placeholder="Senior Hair Stylist"
                  onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email {editing ? '(locked)' : '*'}</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  disabled={!!editing}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  {...phoneInputProps}
                  onChange={(e) => setForm({ ...form, phone: digitsOnly(e.target.value) })}
                />
              </div>
            </div>

            {!editing && (
              <div className="space-y-2">
                <Label htmlFor="password">Password * (min 6)</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Share this with the staff member on their first day.
                </p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="experience">Experience (years)</Label>
                <Input
                  id="experience"
                  type="number"
                  min={0}
                  value={form.experienceYears}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      experienceYears: Number(e.target.value),
                    })
                  }
                />
              </div>
              {editing && (
                <div className="flex items-end gap-3 pb-1">
                  <div>
                    <Label className="block">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Inactive staff are hidden from bookings
                    </p>
                  </div>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={3}
                placeholder="A few words about the stylist"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Specialties</Label>
              <div className="flex flex-wrap gap-3 rounded-lg border p-3">
                {categories.data?.map((c) => {
                  const on = form.specialties.includes(c.key);
                  return (
                    <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox checked={on} onCheckedChange={() => toggleSpecialty(c.key)} />
                      {c.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? 'Save changes' : 'Create staff'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toRemove}
        title="Remove this staff member?"
        description={
          toRemove
            ? `${toRemove.name} will be deactivated and won't appear in bookings. This can't be undone.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        loading={deactivateMut.isPending}
        onConfirm={deactivate}
        onCancel={() => setToRemove(null)}
      />
    </div>
  );
}

export default StaffManagementPage;
