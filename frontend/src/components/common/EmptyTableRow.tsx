import { SearchX } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';

// A single "nothing matched" row spanning the whole table — the same
// dashed-content messaging convention used elsewhere in the app (e.g. the
// Coupons list, Overview's low-stock card), applied to the one place it was
// missing: a search/filter that narrows a table to zero rows.
function EmptyTableRow({
  colSpan,
  message = 'No results match your search.',
}: {
  colSpan: number;
  message?: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-32 text-center text-muted-foreground">
        <div className="flex flex-col items-center justify-center gap-2">
          <SearchX className="h-5 w-5" />
          {message}
        </div>
      </TableCell>
    </TableRow>
  );
}

export default EmptyTableRow;
