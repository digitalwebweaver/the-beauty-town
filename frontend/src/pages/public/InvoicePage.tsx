import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Check, Copy, Loader2, Printer, Share2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { formatInr } from '@/lib/formatCurrency';
import { useSettings, SETTINGS_FALLBACK } from '@/services/settings.api';
import { useInvoice } from '@/services/sales.api';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
};

function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { data: invoice, isLoading, isError } = useInvoice(id ?? null);
  const settings = useSettings().data ?? SETTINGS_FALLBACK;

  // A4 page size for this document specifically, whenever it's printed.
  useEffect(() => {
    let styleEl = document.getElementById('invoice-print-page-size') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'invoice-print-page-size';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = '@page { size: A4; margin: 15mm; }';
  }, []);

  const invoiceUrl = typeof window !== 'undefined' ? window.location.href : '';

  const shareOnWhatsApp = () => {
    if (!invoice) return;
    const message = `Here's your invoice from ${settings.name} — ${formatInr(invoice.total_inr)}\n${invoiceUrl}`;
    const phone = invoice.customer_phone ? `91${invoice.customer_phone.replace(/\D/g, '')}` : '';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(invoiceUrl);
      toast.success('Invoice link copied');
    } catch {
      toast.error("Couldn't copy — copy it from the address bar instead");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted/30 px-4 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Invoice not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This link may be wrong, or the invoice may have been removed.
        </p>
        <Button asChild variant="outline" className="mt-2">
          <Link to={ROUTES.home}>Back to {settings.name}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl px-4 print:max-w-none print:px-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link to={ROUTES.home} className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> {settings.name}
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy className="mr-2 h-4 w-4" /> Copy link
            </Button>
            <Button variant="outline" size="sm" onClick={shareOnWhatsApp}>
              <Share2 className="mr-2 h-4 w-4" /> WhatsApp
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        </div>

        {invoice.status === 'void' && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive print:hidden">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            This invoice was voided{invoice.void_reason ? ` — ${invoice.void_reason}` : ''} and is
            no longer a valid charge.
          </div>
        )}

        <div className="rounded-xl border bg-white p-4 text-black shadow-sm sm:p-8 print:rounded-none print:border-none print:p-0 print:shadow-none">
          <div className="flex flex-col gap-4 border-b-2 border-black pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-2xl font-bold">{settings.name}</p>
              <p className="text-sm">{settings.address}</p>
              <p className="text-sm">
                {settings.phone} · {settings.email}
              </p>
              {settings.gstin && <p className="text-sm">GSTIN: {settings.gstin}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-xl font-bold uppercase">Invoice</p>
              <p className="text-sm">#{invoice.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-sm">{new Date(invoice.created_at).toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 text-sm sm:flex-row sm:justify-between">
            <div>
              <p className="text-xs uppercase text-neutral-500">Billed to</p>
              <p className="font-medium">{invoice.customer_name || 'Walk-in guest'}</p>
              {invoice.customer_phone && <p>{invoice.customer_phone}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-xs uppercase text-neutral-500">Served by</p>
              <p className="font-medium">{invoice.staff_name}</p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="py-2 font-semibold">Item</th>
                  <th className="py-2 text-right font-semibold">Qty</th>
                  <th className="py-2 text-right font-semibold">Unit price</th>
                  <th className="py-2 text-right font-semibold">Discount</th>
                  <th className="py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it) => (
                  <tr key={it.id} className="border-b border-neutral-300">
                    <td className="py-2">{it.name}</td>
                    <td className="py-2 text-right">{it.quantity}</td>
                    <td className="py-2 text-right">{formatInr(it.unitPrice)}</td>
                    <td className="py-2 text-right">
                      {Number(it.discount) > 0 ? `−${formatInr(it.discount)}` : '—'}
                    </td>
                    <td className="py-2 text-right">{formatInr(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatInr(invoice.subtotal_inr)}</span>
              </div>
              {Number(invoice.discount_inr) - Number(invoice.coupon_discount_inr) > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>
                    −{formatInr(Number(invoice.discount_inr) - Number(invoice.coupon_discount_inr))}
                  </span>
                </div>
              )}
              {invoice.coupon_code && (
                <div className="flex justify-between">
                  <span>Coupon {invoice.coupon_code}</span>
                  <span>−{formatInr(invoice.coupon_discount_inr)}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-black pt-1 text-base font-bold">
                <span>Total</span>
                <span>{formatInr(invoice.total_inr)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase text-neutral-500">Payment</p>
            {invoice.payments.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{PAYMENT_LABELS[p.method] ?? p.method}</span>
                <span>{formatInr(p.amount)}</span>
              </div>
            ))}
          </div>

          <p className="mt-10 flex items-center justify-center gap-1 text-center text-xs text-neutral-500">
            <Check className="h-3.5 w-3.5" /> Thank you for choosing {settings.name}.
          </p>
        </div>
      </div>
    </div>
  );
}

export default InvoicePage;
