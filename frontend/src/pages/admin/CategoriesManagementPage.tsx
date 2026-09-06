import { useState } from 'react';
import { toast } from 'sonner';
import { ArchiveRestore, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import PageHeader from '@/components/common/PageHeader';
import EmptyTableRow from '@/components/common/EmptyTableRow';
import SectionError from '@/components/common/SectionError';
import { apiError } from '@/lib/apiError';
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  type ServiceCategoryDto,
} from '@/services/services.api';

function genderFromKey(key: string): 'male' | 'female' | null {
  if (key.startsWith('male-')) return 'male';
  if (key.startsWith('female-')) return 'female';
  return null;
}

function CategoriesManagementPage() {
  const categories = useAdminCategories();
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCategoryDto | null>(null);
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [label, setLabel] = useState('');
  const [displayOrder, setDisplayOrder] = useState('');

  const openNew = () => {
    setEditing(null);
    setGender('female');
    setLabel('');
    setDisplayOrder('');
    setOpen(true);
  };

  const openEdit = (c: ServiceCategoryDto) => {
    setEditing(c);
    setLabel(c.label);
    setDisplayOrder(String(c.display_order));
    setOpen(true);
  };

  const save = async () => {
    if (label.trim().length < 2) return toast.error('Please enter a name');
    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          label: label.trim(),
          displayOrder: displayOrder ? Number(displayOrder) : undefined,
          isActive: editing.is_active,
        });
        toast.success('Category updated');
      } else {
        await createMut.mutateAsync({
          gender,
          label: label.trim(),
          displayOrder: displayOrder ? Number(displayOrder) : undefined,
        });
        toast.success('Category added');
      }
      setOpen(false);
    } catch (err) {
      toast.error(apiError(err, 'Could not save category'));
    }
  };

  const toggleActive = async (c: ServiceCategoryDto) => {
    try {
      await updateMut.mutateAsync({ id: c.id, isActive: !c.is_active });
      toast.success(c.is_active ? 'Category archived' : 'Category reactivated');
    } catch (err) {
      toast.error(apiError(err, 'Update failed'));
    }
  };

  const sorted = [...(categories.data ?? [])].sort(
    (a, b) => a.display_order - b.display_order || a.label.localeCompare(b.label)
  );

  return (
    <div>
      <PageHeader
        title="Categories"
        description="The Male/Female groupings services are organized under, on both the booking flow and the public menu."
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Add category
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          {categories.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : categories.isError ? (
            <SectionError
              message="Couldn't load categories right now."
              onRetry={() => categories.refetch()}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.length === 0 && (
                    <EmptyTableRow colSpan={5} message="No categories yet." />
                  )}
                  {sorted.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-muted-foreground">{c.display_order}</TableCell>
                      <TableCell className="font-medium">{c.label}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {genderFromKey(c.key) ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {c.is_active ? (
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
                            aria-label={`Edit ${c.label}`}
                            onClick={() => openEdit(c)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={c.is_active ? 'Archive' : 'Reactivate'}
                            aria-label={`${c.is_active ? 'Archive' : 'Reactivate'} ${c.label}`}
                            onClick={() => toggleActive(c)}
                            disabled={updateMut.isPending}
                          >
                            {c.is_active ? (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            ) : (
                              <ArchiveRestore className="h-4 w-4 text-emerald-600" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit category' : 'Add category'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'The gender and internal key stay fixed once created — only the display name, order, and status can change.'
                : 'Services get filed under this on both the admin catalog and the public menu.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editing && (
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as 'male' | 'female')}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Can't be changed later — this decides which gender tab the category shows under.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cat-label">Name</Label>
              <Input
                id="cat-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Hair Extensions"
              />
            </div>

            {editing && (
              <div className="space-y-2">
                <Label>Key</Label>
                <Input value={editing.key} disabled className="font-mono text-xs" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cat-order">Display order</Label>
              <Input
                id="cat-order"
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first. Categories with the same order sort alphabetically.
              </p>
            </div>

            {editing && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">
                    Archived categories are hidden from the booking flow and public menu.
                  </p>
                </div>
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? 'Save' : 'Add category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CategoriesManagementPage;
