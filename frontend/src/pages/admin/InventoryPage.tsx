import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { AlertTriangle, Package, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/common/PageHeader';
import EmptyTableRow from '@/components/common/EmptyTableRow';
import { useProducts, useUpdateProduct } from '@/services/products.api';

function apiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.error?.message ?? err.message ?? fallback;
  }
  return fallback;
}

function InventoryPage() {
  const { data, isLoading } = useProducts();
  const updateMut = useUpdateProduct();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stockValue, setStockValue] = useState<number>(0);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!q) return data;
    const needle = q.toLowerCase();
    return data.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.brand?.toLowerCase().includes(needle) ||
        p.category?.toLowerCase().includes(needle)
    );
  }, [data, q]);

  const startEdit = (id: string, currentStock: number) => {
    setEditingId(id);
    setStockValue(currentStock);
  };

  const saveStock = async (id: string) => {
    try {
      await updateMut.mutateAsync({ id, stock: stockValue });
      toast.success('Stock updated');
      setEditingId(null);
    } catch (err) {
      toast.error(apiError(err, 'Update failed'));
    }
  };

  const lowStock = data?.filter((p) => p.stock <= p.reorder_level) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Track products, monitor stock levels." />

      {lowStock.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                {lowStock.length} product{lowStock.length > 1 ? 's' : ''} below reorder level
              </p>
              <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-200/70">
                {lowStock.map((p) => p.name).join(', ')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products…"
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Reorder at</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <EmptyTableRow
                    colSpan={7}
                    message={q ? 'No products match your search.' : 'No products yet.'}
                  />
                )}
                {filtered.map((p) => {
                  const low = p.stock <= p.reorder_level;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-[220px]">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Package className="h-4 w-4" />
                          </div>
                          <p className="truncate font-medium">{p.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate">{p.category}</TableCell>
                      <TableCell className="max-w-[140px] truncate">{p.brand}</TableCell>
                      <TableCell>
                        {editingId === p.id ? (
                          <Input
                            type="number"
                            className="h-8 w-20"
                            value={stockValue}
                            onChange={(e) => setStockValue(Number(e.target.value))}
                          />
                        ) : (
                          <Badge variant={low ? 'destructive' : 'secondary'}>{p.stock} units</Badge>
                        )}
                      </TableCell>
                      <TableCell>{p.reorder_level}</TableCell>
                      <TableCell className="text-right">
                        ₹{Number(p.price_inr).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === p.id ? (
                          <div className="inline-flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => saveStock(p.id)}
                              disabled={updateMut.isPending}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant={low ? 'default' : 'outline'}
                            onClick={() => startEdit(p.id, p.stock)}
                          >
                            Update stock
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default InventoryPage;
